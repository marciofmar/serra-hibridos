// Fale conosco: abre a tela, monta o formulário e envia para o Worker em contador/ (rota /contato).
import { CONTADOR_URL } from './contador.js';

const DICAS = {
  relato: 'Ex.: subi a Serra de Petrópolis a 80 km/h, com três pessoas e ar ligado. Saí com 60% de bateria e cheguei com 22%. O motor a gasolina ligou na metade e o carro não perdeu força.',
  serra: 'Nome da serra, rodovia, sentido da subida e onde ela começa e termina.',
  dado: 'Qual carro, qual dado está errado e qual é o valor certo. Se tiver, diga a fonte.',
  problema: 'O que você fez, o que aconteceu e em qual celular ou navegador.',
  sugestao: 'O que você gostaria de ver no simulador?',
  elogio: 'Conte o que achou.'
};
const LINK = { relato: 'Link da gravação (Strava, Wikiloc…)', serra: 'Link da gravação ou do mapa', dado: 'Link da fonte' };

/**
 * @param {object} o  { vehicles, climbs, currentClimb: () => id da subida escolhida no simulador }
 */
export function initContato({ vehicles, climbs, currentClimb }) {
  const $ = id => document.getElementById(id);
  const dlg = $('contato'), form = $('contatoForm'), assunto = $('cfAssunto');

  const carros = vehicles.flatMap(v => v.batteryOptions
    ? v.batteryOptions.map(o => `${v.name}, bateria de ${o.battery.toLocaleString('pt-BR')} kWh`)
    : [v.name]);
  $('cfCarro').innerHTML = '<option value="">Não informar</option>' +
    carros.map(c => `<option>${c}</option>`).join('') + '<option>Outro carro</option>';
  const grupos = {};
  for (const [id, c] of Object.entries(climbs)) (grupos[c.group] ||= []).push([id, c]);
  $('cfSerra').innerHTML = '<option value="">Não informar</option>' +
    Object.entries(grupos).map(([g, list]) =>
      `<optgroup label="${g}">${list.map(([id, c]) => `<option value="${c.name}" data-id="${id}">${c.name}</option>`).join('')}</optgroup>`).join('') +
    '<option>Outra serra</option>';

  function escolher(a) {
    if (a) assunto.value = a;
    const v = assunto.value;
    $('cfRelato').hidden = v !== 'relato';
    $('cfLinkField').hidden = !LINK[v];
    $('cfLinkLabel').textContent = LINK[v] || 'Link';
    $('cfMensagem').placeholder = DICAS[v] || 'Escreva aqui.';
    // No relato, já sugere a serra que está aberta no simulador
    if (v === 'relato' && !$('cfSerra').value) {
      const op = $('cfSerra').querySelector(`option[data-id="${currentClimb()}"]`);
      if (op) $('cfSerra').value = op.value;
    }
  }

  function abrir(a) {
    const limits = $('limits');
    if (limits.open) limits.close();
    if (a) escolher(a);
    if (!dlg.open) dlg.showModal();
  }

  document.querySelectorAll('[data-open-contato]').forEach(b =>
    b.addEventListener('click', () => abrir(b.dataset.openContato)));
  dlg.querySelectorAll('[data-close-contato]').forEach(b => b.addEventListener('click', () => dlg.close()));
  // Sem fechar ao tocar fora: no celular é fácil perder um texto longo por engano.
  dlg.addEventListener('close', () => { if (location.hash === '#contato') history.replaceState(null, '', location.pathname + location.search); });
  if (location.hash === '#contato') abrir();
  window.addEventListener('hashchange', () => { if (location.hash === '#contato') abrir(); });

  assunto.addEventListener('change', () => escolher());
  dlg.querySelectorAll('.contrib [data-assunto]').forEach(b => b.addEventListener('click', () => {
    escolher(b.dataset.assunto);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('cfMensagem').focus({ preventScroll: true });
  }));

  const erro = $('cfErro'), enviar = $('cfEnviar');
  const mostrarErro = t => { erro.textContent = t; erro.hidden = !t; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    mostrarErro('');
    if (!form.reportValidity()) return;
    const dados = Object.fromEntries(new FormData(form));
    if (dados.assunto !== 'relato') ['carro', 'serra', 'bateriaPe', 'bateriaTopo'].forEach(k => delete dados[k]);
    if (!LINK[dados.assunto]) delete dados.link;
    enviar.disabled = true;
    enviar.textContent = 'Enviando…';
    try {
      const r = await fetch(`${CONTADOR_URL}/contato`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
      });
      if (r.status === 429) throw new Error('Muitas mensagens seguidas. Espere um minuto e tente de novo.');
      if (!r.ok) throw new Error('Não foi possível enviar agora. Tente de novo em alguns minutos.');
      form.reset();
      escolher();
      form.hidden = true;
      $('cfOk').hidden = false;
      $('cfOk').scrollIntoView({ block: 'nearest' });
    } catch (err) {
      mostrarErro(err instanceof TypeError
        ? 'Sem conexão com o servidor. Confira a internet e tente de novo; o texto continua aqui.'
        : err.message);
    } finally {
      enviar.disabled = false;
      enviar.textContent = 'Enviar';
    }
  });

  $('cfOutra').addEventListener('click', () => {
    $('cfOk').hidden = true;
    form.hidden = false;
    assunto.focus();
  });
}
