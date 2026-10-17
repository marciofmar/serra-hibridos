// Contador de acessos e Fale conosco do Híbridos na Serra (Cloudflare Worker + banco D1).
//
// Cada acesso grava data e hora (UTC) e a localização aproximada que a própria
// Cloudflare deduz do IP (cidade, estado, país). O IP não é gravado.
//
// Rotas:
//   POST /visita          registra um acesso e devolve { total }   (só a partir do site)
//   GET  /total           devolve { total }
//   POST /contato         grava uma mensagem do Fale conosco       (só a partir do site)
//                         e avisa no Telegram, se TELEGRAM_TOKEN e TELEGRAM_CHAT_ID existirem
//   GET  /admin           mensagens e histórico de acessos, protegido por senha (usuário
//                         qualquer, senha = segredo ADMIN_SENHA). Não há link para ela no site.
//   POST /admin/mensagem  marca mensagem como lida/não lida ou apaga (mesma senha)

const ORIGENS = ['https://marciofmar.github.io', 'http://localhost:5173'];
const FUSO = 'America/Sao_Paulo';

const ASSUNTOS = {
  relato: 'Relato de subida', serra: 'Nova serra', dado: 'Correção de dado',
  problema: 'Problema no site', sugestao: 'Sugestão', elogio: 'Elogio'
};
const LIMITE_DIA = 200; // teto de mensagens em 24 h, contra enxurrada de spam

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const cors = ORIGENS.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    }

    if (url.pathname === '/contato' && req.method === 'POST') {
      if (!cors['Access-Control-Allow-Origin']) return new Response('origem não permitida', { status: 403 });
      return receberMensagem(req, env, ctx, cors, url.origin);
    }

    if (url.pathname === '/admin/mensagem' && req.method === 'POST') {
      if (!(await autorizado(req, env))) return pedirSenha();
      if (origin !== url.origin) return new Response('origem não permitida', { status: 403 });
      const f = await req.formData();
      const id = Number(f.get('id'));
      const acao = f.get('acao');
      if (acao === 'lida' || acao === 'naolida') {
        await env.DB.prepare('UPDATE mensagens SET lida = ? WHERE id = ?').bind(acao === 'lida' ? 1 : 0, id).run();
      } else if (acao === 'apagar') {
        await env.DB.prepare('DELETE FROM mensagens WHERE id = ?').bind(id).run();
      }
      return Response.redirect(`${url.origin}/admin#mensagens`, 303);
    }

    if (url.pathname === '/visita' && req.method === 'POST') {
      if (!cors['Access-Control-Allow-Origin']) return new Response('origem não permitida', { status: 403 });
      const cf = req.cf || {};
      const pagina = (url.searchParams.get('p') || '/').slice(0, 100);
      await env.DB.prepare('INSERT INTO acessos (quando, cidade, estado, pais, pagina) VALUES (?, ?, ?, ?, ?)')
        .bind(new Date().toISOString(), cf.city || null, cf.region || null, cf.country || null, pagina)
        .run();
      return json({ total: await total(env) }, cors);
    }

    if (url.pathname === '/total' && req.method === 'GET') {
      return json({ total: await total(env) }, cors);
    }

    if (url.pathname === '/admin' && req.method === 'GET') {
      if (!(await autorizado(req, env))) return pedirSenha();
      return new Response(await paginaAdmin(env), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
      });
    }

    return new Response('não encontrado', { status: 404 });
  }
};

async function total(env) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM acessos').first();
  return r ? r.n : 0;
}

function json(obj, cors, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

function pedirSenha() {
  return new Response('Acesso restrito', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Historico de acessos", charset="UTF-8"', 'Cache-Control': 'no-store' }
  });
}

// ---------- Fale conosco ----------
async function receberMensagem(req, env, ctx, cors, base) {
  let d;
  try { d = await req.json(); } catch { return json({ erro: 'formato inválido' }, cors, 400); }
  if (d.site) return json({ ok: true }, cors); // campo-isca preenchido: robô; finge que gravou

  if (env.LIMITE_CONTATO) {
    const { success } = await env.LIMITE_CONTATO.limit({ key: req.headers.get('CF-Connecting-IP') || 'sem-ip' });
    if (!success) return json({ erro: 'muitas mensagens seguidas' }, cors, 429);
  }

  const m = limpar(d);
  if (!m) return json({ erro: 'dados inválidos' }, cors, 400);

  const desde = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM mensagens WHERE quando >= ?').bind(desde).first();
  if (n >= LIMITE_DIA) return json({ erro: 'limite diário atingido' }, cors, 429);

  const cf = req.cf || {};
  await env.DB.prepare(
    `INSERT INTO mensagens (quando, assunto, mensagem, carro, serra, bateria_pe, bateria_topo, link, nome, email, cidade, estado, pais)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(new Date().toISOString(), m.assunto, m.mensagem, m.carro, m.serra, m.bateriaPe, m.bateriaTopo, m.link,
      m.nome, m.email, cf.city || null, cf.region || null, cf.country || null)
    .run();
  ctx.waitUntil(avisarTelegram(env, m.assunto, base));
  return json({ ok: true }, cors);
}

const texto = (v, max) => { const s = String(v ?? '').trim(); return s ? s.slice(0, max) : null; };
const pct = v => {
  if (v === '' || v == null) return null;
  const n = Math.round(Number(v));
  return n >= 0 && n <= 100 ? n : null;
};

function limpar(d) {
  const assunto = String(d.assunto || '');
  const mensagem = texto(d.mensagem, 4000);
  if (!ASSUNTOS[assunto] || !mensagem) return null;
  let link = texto(d.link, 300);
  if (link && !/^https?:\/\//i.test(link)) link = /^[^\s/]+\.[^\s/]+/.test(link) ? `https://${link}` : null; // "strava.app.link/..." sem https
  let email = texto(d.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = null;
  const relato = assunto === 'relato';
  return {
    assunto, mensagem, link, email, nome: texto(d.nome, 80),
    carro: relato ? texto(d.carro, 80) : null,
    serra: relato ? texto(d.serra, 160) : null,
    bateriaPe: relato ? pct(d.bateriaPe) : null,
    bateriaTopo: relato ? pct(d.bateriaTopo) : null
  };
}

// Aviso sem o conteúdo da mensagem: o texto fica só no banco e se lê no /admin.
async function avisarTelegram(env, assunto, base) {
  if (!env.TELEGRAM_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `Nova mensagem no Híbridos na Serra: ${ASSUNTOS[assunto]}.\nLeia em ${base}/admin#mensagens`,
        disable_web_page_preview: true
      })
    });
  } catch { /* aviso falhou; a mensagem já está gravada */ }
}

// Basic auth: o navegador pede usuário e senha; só a senha é conferida.
async function autorizado(req, env) {
  if (!env.ADMIN_SENHA) return false;
  const h = req.headers.get('Authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  let senha;
  try {
    const dec = new TextDecoder().decode(Uint8Array.from(atob(h.slice(6)), c => c.charCodeAt(0)));
    senha = dec.slice(dec.indexOf(':') + 1);
  } catch { return false; }
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([senha, env.ADMIN_SENHA].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  return crypto.subtle.timingSafeEqual(a, b);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const quando = iso => new Date(iso).toLocaleString('pt-BR', { timeZone: FUSO, dateStyle: 'short', timeStyle: 'short' });
const local = r => [r.cidade, r.estado, r.pais].filter(Boolean).join(', ') || 'desconhecido';

function cartaoMensagem(m) {
  const linhas = [
    ['Carro', esc(m.carro)],
    ['Serra', esc(m.serra)],
    ['Bateria', m.bateria_pe != null || m.bateria_topo != null ? `${m.bateria_pe ?? '?'}% no pé → ${m.bateria_topo ?? '?'}% no topo` : ''],
    ['Link', m.link ? `<a href="${esc(m.link)}" target="_blank" rel="noopener noreferrer nofollow">${esc(m.link)}</a>` : ''],
    ['Nome', esc(m.nome)],
    ['E-mail', m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ''],
    ['Local', esc(local(m))]
  ].filter(([, v]) => v);
  return `<article class="msg${m.lida ? ' lida' : ''}">
<h3>${esc(ASSUNTOS[m.assunto] || m.assunto)}<small>${esc(quando(m.quando))}</small></h3>
<dl>${linhas.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
<p class="txt">${esc(m.mensagem)}</p>
<form method="post" action="/admin/mensagem"><input type="hidden" name="id" value="${m.id}">
<button name="acao" value="${m.lida ? 'naolida' : 'lida'}">${m.lida ? 'Marcar como não lida' : 'Marcar como lida'}</button>
<button name="acao" value="apagar" class="del" onclick="return confirm('Apagar esta mensagem de vez?')">Apagar</button></form>
</article>`;
}

async function paginaAdmin(env) {
  const n = await total(env);
  // Meia-noite de hoje em Brasília (UTC−3 o ano todo desde 2019), em UTC
  const dataHoje = new Date().toLocaleDateString('en-CA', { timeZone: FUSO }); // AAAA-MM-DD
  const desdeHoje = new Date(`${dataHoje}T00:00:00-03:00`).toISOString();
  const { n: nHoje } = await env.DB.prepare('SELECT COUNT(*) AS n FROM acessos WHERE quando >= ?').bind(desdeHoje).first();
  const porLocal = (await env.DB.prepare(
    `SELECT cidade, estado, pais, COUNT(*) AS n, MAX(quando) AS ultimo
       FROM acessos GROUP BY cidade, estado, pais ORDER BY n DESC, ultimo DESC LIMIT 200`).all()).results;
  const ultimos = (await env.DB.prepare(
    'SELECT quando, cidade, estado, pais, pagina FROM acessos ORDER BY id DESC LIMIT 500').all()).results;
  const msgs = (await env.DB.prepare('SELECT * FROM mensagens ORDER BY lida ASC, id DESC LIMIT 300').all()).results;
  const naoLidas = msgs.filter(m => !m.lida).length;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Painel · Híbridos na Serra</title>
<style>
:root{color-scheme:light dark;--bg:#f4f2ec;--card:#fff;--tx:#15171a;--mu:#6b6e73;--ln:rgba(0,0,0,.1);--ac:#1f7a5c}
@media (prefers-color-scheme:dark){:root{--bg:#121413;--card:#1c1f1d;--tx:#eef0ed;--mu:#9a9e98;--ln:rgba(255,255,255,.1);--ac:#4cc497}}
body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:820px;margin:0 auto;padding:20px 16px 40px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:14px}
.kpi{background:var(--card);border:1px solid var(--ln);border-radius:12px;padding:12px 14px}.kpi b{display:block;font-size:26px;color:var(--ac)}.kpi span{color:var(--mu);font-size:13px}
.box{background:var(--card);border:1px solid var(--ln);border-radius:12px;overflow:auto}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:7px 10px;border-bottom:1px solid var(--ln);text-align:left;white-space:nowrap}
th{color:var(--mu);font-weight:600;font-size:12.5px}td.n{text-align:right;font-variant-numeric:tabular-nums}p.mu{color:var(--mu);font-size:13px;margin:0}
.msg{background:var(--card);border:1px solid var(--ln);border-left:4px solid var(--ac);border-radius:12px;padding:12px 14px;margin-bottom:10px}
.msg.lida{border-left-color:var(--ln);opacity:.75}.msg h3{margin:0;font-size:15px}.msg h3 small{font-weight:400;color:var(--mu);font-size:12.5px;margin-left:6px}
.msg dl{display:grid;grid-template-columns:max-content 1fr;gap:2px 10px;margin:8px 0 0;font-size:13.5px}.msg dt{color:var(--mu)}.msg dd{margin:0;overflow-wrap:anywhere}
.msg .txt{white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0}.msg a{color:var(--ac)}
.msg form{display:flex;gap:8px;flex-wrap:wrap}.msg button{font:inherit;font-size:13px;padding:5px 12px;border-radius:999px;border:1px solid var(--ln);background:transparent;color:var(--tx);cursor:pointer}
.msg button.del{color:#c0392b}
</style></head><body><main>
<h1>Híbridos na Serra · painel</h1>
<p class="mu">Localização aproximada deduzida do IP pela Cloudflare; o IP não é gravado. Horários de Brasília.</p>
<div class="kpis">
  <div class="kpi"><b>${naoLidas}</b><span>mensagens não lidas</span></div>
  <div class="kpi"><b>${n}</b><span>acessos no total</span></div>
  <div class="kpi"><b>${nHoje}</b><span>acessos hoje</span></div>
  <div class="kpi"><b>${porLocal.length}</b><span>locais diferentes</span></div>
</div>
<h2 id="mensagens">Mensagens do Fale conosco</h2>
${msgs.map(cartaoMensagem).join('') || '<p class="mu">Nenhuma mensagem ainda.</p>'}
<h2>Acessos por local</h2>
<div class="box"><table><thead><tr><th>Local</th><th class="n">Acessos</th><th>Último</th></tr></thead><tbody>
${porLocal.map(r => `<tr><td>${esc(local(r))}</td><td class="n">${r.n}</td><td>${esc(quando(r.ultimo))}</td></tr>`).join('') || '<tr><td colspan="3">Nenhum acesso ainda.</td></tr>'}
</tbody></table></div>
<h2>Últimos ${ultimos.length} acessos</h2>
<div class="box"><table><thead><tr><th>Quando</th><th>Local</th><th>Página</th></tr></thead><tbody>
${ultimos.map(r => `<tr><td>${esc(quando(r.quando))}</td><td>${esc(local(r))}</td><td>${esc(r.pagina)}</td></tr>`).join('') || '<tr><td colspan="3">Nenhum acesso ainda.</td></tr>'}
</tbody></table></div>
</main></body></html>`;
}
