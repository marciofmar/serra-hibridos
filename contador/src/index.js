// Contador de acessos do Híbridos na Serra (Cloudflare Worker + banco D1).
//
// Cada acesso grava data e hora (UTC) e a localização aproximada que a própria
// Cloudflare deduz do IP (cidade, estado, país). O IP não é gravado.
//
// Rotas:
//   POST /visita  registra um acesso e devolve { total }   (só a partir do site)
//   GET  /total   devolve { total }
//   GET  /admin   histórico de acessos, protegido por senha (usuário qualquer,
//                 senha = segredo ADMIN_SENHA). Não há link para ela no site.

const ORIGENS = ['https://marciofmar.github.io', 'http://localhost:5173'];
const FUSO = 'America/Sao_Paulo';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const cors = ORIGENS.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Max-Age': '86400' } });
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
      if (!(await autorizado(req, env))) {
        return new Response('Acesso restrito', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Historico de acessos", charset="UTF-8"', 'Cache-Control': 'no-store' }
        });
      }
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

function json(obj, cors) {
  return new Response(JSON.stringify(obj), { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
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

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Acessos · Híbridos na Serra</title>
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
</style></head><body><main>
<h1>Acessos do Híbridos na Serra</h1>
<p class="mu">Localização aproximada deduzida do IP pela Cloudflare; o IP não é gravado. Horários de Brasília.</p>
<div class="kpis">
  <div class="kpi"><b>${n}</b><span>acessos no total</span></div>
  <div class="kpi"><b>${nHoje}</b><span>acessos hoje</span></div>
  <div class="kpi"><b>${porLocal.length}</b><span>locais diferentes</span></div>
</div>
<h2>Por local</h2>
<div class="box"><table><thead><tr><th>Local</th><th class="n">Acessos</th><th>Último</th></tr></thead><tbody>
${porLocal.map(r => `<tr><td>${esc(local(r))}</td><td class="n">${r.n}</td><td>${esc(quando(r.ultimo))}</td></tr>`).join('') || '<tr><td colspan="3">Nenhum acesso ainda.</td></tr>'}
</tbody></table></div>
<h2>Últimos ${ultimos.length} acessos</h2>
<div class="box"><table><thead><tr><th>Quando</th><th>Local</th><th>Página</th></tr></thead><tbody>
${ultimos.map(r => `<tr><td>${esc(quando(r.quando))}</td><td>${esc(local(r))}</td><td>${esc(r.pagina)}</td></tr>`).join('') || '<tr><td colspan="3">Nenhum acesso ainda.</td></tr>'}
</tbody></table></div>
</main></body></html>`;
}
