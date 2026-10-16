// Contador de acessos (serviço em contador/, na Cloudflare).
// Conta uma vez por sessão do navegador e só no site publicado; em testes locais apenas lê o total.
const CONTADOR_URL = 'https://serra-hibridos-contador.marciofmar.workers.dev';
const PUBLICADO = location.hostname === 'marciofmar.github.io';

export async function contarAcesso(el) {
  if (!CONTADOR_URL.startsWith('https://')) return;
  let jaContou = false;
  try { jaContou = sessionStorage.getItem('acessoContado') === '1'; } catch { /* sem storage */ }
  const registrar = PUBLICADO && !jaContou;
  try {
    const r = await fetch(registrar ? `${CONTADOR_URL}/visita?p=${encodeURIComponent(location.pathname)}` : `${CONTADOR_URL}/total`,
      { method: registrar ? 'POST' : 'GET', keepalive: true });
    if (!r.ok) return;
    const { total } = await r.json();
    if (registrar) try { sessionStorage.setItem('acessoContado', '1'); } catch { /* sem storage */ }
    el.textContent = `${total.toLocaleString('pt-BR')} ${total === 1 ? 'acesso' : 'acessos'}`;
    el.hidden = false;
  } catch { /* contador fora do ar não atrapalha o simulador */ }
}
