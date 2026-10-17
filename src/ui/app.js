import { VEHICLES } from '../model/vehicles.js';
import { CLIMBS, totals, buildProfile } from '../model/climbs.js';
import { simulate, summarize } from '../model/simulate.js';
import { DRIVING_STYLES } from '../model/config.js';
import { MODES, cssFill } from './modes.js';
import { createRide } from './ride.js';
import { contarAcesso } from './contador.js';
import { initContato } from './contato.js';

const $ = id => document.getElementById(id);
const fmt1 = x => x.toFixed(1).replace('.', ',');

const cars = VEHICLES.map(v => ({ ...v }));
let selectedCar = 0;
let results = [];

// ---------- Controles ----------
function fillSelects() {
  const groups = {};
  for (const [id, c] of Object.entries(CLIMBS)) (groups[c.group] ||= []).push([id, c]);
  $('climb').innerHTML = Object.entries(groups).map(([g, list]) =>
    `<optgroup label="${g}">${list.map(([id, c]) => `<option value="${id}">${c.name}</option>`).join('')}</optgroup>`).join('');
  $('climb').value = 'cj';
  $('style').innerHTML = Object.entries(DRIVING_STYLES).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('');
  $('style').value = 'n';
  const s24 = cars.find(c => c.id === 's24');
  $('b24').innerHTML = s24.batteryOptions.map((o, i) => `<option value="${i}">${o.label}</option>`).join('');
  const tabs = cars.map((c, i) => `<button role="tab" data-i="${i}"><i style="background:${c.color}"></i>${c.name}</button>`).join('');
  $('carTabs').innerHTML = tabs;
  $('rideTabs').innerHTML = tabs;
  $('modeLegend').innerHTML = Object.values(MODES).map(m => `<span><i class="swatch" style="background:${cssFill(m)}"></i>${m.label}</span>`).join('');
  $('socLegend').innerHTML = cars.map(c => `<span><i style="background:${c.color}"></i>${c.name}</span>`).join('') +
    '<span><i class="dashed"></i>Carga em que o térmico liga</span>';
}

function applyPreset() {
  const climb = CLIMBS[$('climb').value];
  const t = totals(climb);
  $('length').value = t.L;
  $('gain').value = t.G;
  $('approach').value = climb.approach || 0;
  if (climb.defaultSpeed) $('speed').value = climb.defaultSpeed;
  run();
}

function readInputs() {
  const s24 = cars.find(c => c.id === 's24');
  Object.assign(s24, s24.batteryOptions[+$('b24').value]);
  return {
    climb: CLIMBS[$('climb').value],
    L: +$('length').value, G: +$('gain').value, approach: +$('approach').value,
    soc0: +$('soc0').value, threshold: $('thrMode').value === 'auto' ? null : +$('threshold').value,
    speedKmh: +$('speed').value, extraKg: +$('extra').value, style: $('style').value
  };
}

// ---------- Gráficos ----------
const css = getComputedStyle(document.documentElement);
const tick = css.getPropertyValue('--muted').trim() || '#898781';
const grid = css.getPropertyValue('--grid').trim() || '#e1e0d9';
const accent = css.getPropertyValue('--accent').trim() || '#1f7a5c';
Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
Chart.defaults.font.size = 11;
function makeChart(id, yTitle, unit) {
  return new Chart($(id), {
    type: 'line', data: { datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { padding: 10, cornerRadius: 8, boxPadding: 4, callbacks: {
        title: t => t[0].parsed.x.toFixed(1) + ' km',
        label: i => `${i.dataset.label}: ${Math.round(i.parsed.y)}${unit}` } } },
      elements: { point: { radius: 0 }, line: { borderWidth: 1.5 } },
      scales: {
        x: { type: 'linear', min: 0, title: { display: true, text: 'km', color: tick }, ticks: { color: tick, maxTicksLimit: 8 }, grid: { display: false } },
        y: { title: { display: true, text: yTitle, color: tick }, ticks: { color: tick }, grid: { color: grid }, border: { display: false } }
      }
    }
  });
}
const altChart = makeChart('altChart', 'm', ' m');
const socChart = makeChart('socChart', '% de carga', '%');
const powerChart = makeChart('powerChart', 'kW', ' kW');
socChart.options.scales.y.min = 0;
socChart.options.scales.y.max = 100;

const ride = createRide({
  canvas: $('rideCanvas'), phase: $('ridePhase'), hud: $('rideHud'), log: $('rideLog'), clock: $('rideClock'),
  play: $('ridePlay'), restart: $('rideRestart'), scrub: $('rideScrub'), rate: $('rideRate')
});
let profile = null;

// ---------- Execução ----------
function run() {
  const inp = readInputs();
  profile = buildProfile(inp.climb, inp);
  const opts = { startAlt: profile.startAlt, soc0: inp.soc0, threshold: inp.threshold, speedKmh: inp.speedKmh, extraKg: inp.extraKg, style: inp.style };
  results = cars.map(c => simulate(c, profile.segments, opts));

  $('approachOut').textContent = `${fmt1(inp.approach)} km`;
  $('lengthOut').textContent = `${fmt1(inp.L)} km`;
  $('gainOut').textContent = `${inp.G} m`;
  $('soc0Out').textContent = `${inp.soc0}%`;
  $('thresholdOut').textContent = `${$('threshold').value}%`;
  $('thresholdRow').hidden = inp.threshold === null;
  $('speedOut').textContent = `${inp.speedKmh} km/h`;
  $('extraOut').textContent = `${inp.extraKg} kg`;
  document.querySelectorAll('input[type=range]').forEach(r =>
    r.style.setProperty('--p', `${(r.value - r.min) / (r.max - r.min) * 100}%`));
  const gradeText = inp.climb.segments
    ? `Inclinações de ${fmt1(Math.min(...profile.grades))}% a ${fmt1(Math.max(...profile.grades))}%`
    : `Serra com média de ${fmt1(inp.G / (inp.L * 10))}%`;
  const approachText = inp.approach > 0
    ? ` Antes, ${fmt1(inp.approach)} km de aproximação desde ~${Math.round(profile.startAlt)} m.` : '';
  $('info').replaceChildren(Object.assign(document.createElement('strong'), { textContent: inp.climb.name }));
  $('info').append(`${gradeText}, de ~${Math.round(profile.serraStartAlt)} m a ~${Math.round(profile.topAlt)} m em ${fmt1(inp.L)} km.${approachText} Total: ${fmt1(profile.totalKm)} km. ${inp.climb.note}.`);
  $('endKm').textContent = `${fmt1(profile.totalKm)} km`;
  [altChart, socChart, powerChart].forEach(ch => (ch.options.scales.x.max = +profile.totalKm.toFixed(1)));

  altChart.data.datasets = [{ label: 'Altitude', borderColor: accent, borderWidth: 2, fill: true,
    backgroundColor: ctx => {
      const { chartArea, ctx: g } = ctx.chart;
      if (!chartArea) return 'transparent';
      const grad = g.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      grad.addColorStop(0, accent + '55');
      grad.addColorStop(1, accent + '05');
      return grad;
    },
    data: [{ x: 0, y: profile.startAlt }].concat(results[0].points.filter((p, j) => j % 2 === 1).map(p => ({ x: p.km, y: p.alt }))) }];
  altChart.update();

  socChart.data.datasets = cars.map((c, i) => ({ label: c.name, borderColor: c.color, borderDash: c.dash, borderWidth: 2,
    data: results[i].points.filter((p, j) => j % 2 === 0).map(p => ({ x: p.km, y: p.soc })) }))
    .concat(inp.threshold === null
      ? cars.map((c, i) => ({ label: `Limiar ${c.name}`, borderColor: c.color + '99', borderWidth: 1, borderDash: [2, 3],
          data: [{ x: 0, y: results[i].threshold }, { x: profile.totalKm, y: results[i].threshold }] }))
      : [{ label: 'Limiar', borderColor: '#898781', borderWidth: 1, borderDash: [2, 3], data: [{ x: 0, y: inp.threshold }, { x: profile.totalKm, y: inp.threshold }] }]);
  socChart.update();

  $('cards').innerHTML = cars.map((c, i) => {
    const s = summarize(results[i], inp.speedKmh);
    const soc = Math.round(s.finalSoc);
    const status = s.speedDropped ? ['bad', `Velocidade cai para ${Math.round(s.minSpeed)} km/h`]
      : s.weakKm > 0 ? ['warn', `Fica sem fôlego em ${fmt1(s.weakKm)} km`]
      : ['ok', 'Sobe sem perder fôlego'];
    return `<article class="card" style="--car:${c.color}">
      <div class="card-head"><span class="dot"></span><h3>${c.name}</h3><span class="tag">${fmt1(c.battery)} kWh</span></div>
      <div class="soc"><span class="big">${soc}%</span><span class="unit">de bateria no topo</span></div>
      <div class="meter" title="Linha: carga em que o térmico liga"><span style="width:${Math.max(0, Math.min(100, soc))}%"></span><i style="left:${results[i].threshold}%"></i></div>
      <p class="floor">Térmico liga em ${results[i].threshold}%${inp.threshold === null ? ' (padrão de fábrica)' : ''}</p>
      <dl class="stats">
        <div><dt>Gasolina</dt><dd>${fmt1(s.fuelL)} L</dd></div>
        <div><dt>No elétrico</dt><dd>${fmt1(s.evKm)} km</dd></div>
        <div><dt>Sem fôlego</dt><dd class="${s.weakKm > 0 ? 'bad' : ''}">${fmt1(s.weakKm)} km</dd></div>
        <div><dt>Vel. mínima</dt><dd class="${s.speedDropped ? 'bad' : ''}">${Math.round(s.minSpeed)} km/h</dd></div>
      </dl>
      <p class="status ${status[0]}">${status[1]}</p></article>`;
  }).join('');
  drawStrips();
  drawSelected();
}

function stripHtml(pts) {
  let html = '';
  for (let i = 0; i < pts.length;) {
    let j = i;
    while (j < pts.length && pts[j].mode === pts[i].mode) j++;
    html += `<div style="flex:${j - i};background:${cssFill(MODES[pts[i].mode])}"></div>`;
    i = j;
  }
  return html;
}

function drawStrips() {
  $('strips').innerHTML = cars.map((c, i) => {
    const { evKm } = summarize(results[i]);
    return `<button type="button" class="strip-row" data-i="${i}" style="--strip-car:${c.color}" title="Mostrar a potência do ${c.name}">
      <span class="strip-name"><i style="background:${c.color}"></i>${c.name}<small>${fmt1(evKm)} km no elétrico</small></span>
      <span class="strip">${stripHtml(results[i].points)}</span></button>`;
  }).join('');
}

function drawSelected() {
  const pts = results[selectedCar].points;
  powerChart.data.datasets = [
    { label: 'Máximo disponível', borderColor: '#5F5E5A', data: pts.map(p => ({ x: p.km, y: p.pAvail })) },
    { label: 'Pedida', borderColor: '#898781', borderDash: [6, 4], data: pts.map(p => ({ x: p.km, y: p.pWanted })) },
    { label: 'Motor térmico', borderColor: '#eda100', data: pts.map(p => ({ x: p.km, y: p.pEngine })) },
    { label: 'Bateria', borderColor: '#1baf7a', data: pts.map(p => ({ x: p.km, y: p.pBattery })) }
  ];
  powerChart.update();
  document.querySelectorAll('#carTabs button, #rideTabs button, #strips button').forEach(b => {
    const on = +b.dataset.i === selectedCar;
    b.classList.toggle('active', on);
    b.setAttribute(b.role === 'tab' ? 'aria-selected' : 'aria-pressed', on);
  });
  ride.setData({ points: pts, car: cars[selectedCar], startAlt: profile.startAlt });
}

fillSelects();
['approach', 'length', 'gain', 'soc0', 'threshold', 'speed', 'extra'].forEach(id => $(id).addEventListener('input', run));
['style', 'b24', 'thrMode'].forEach(id => $(id).addEventListener('change', run));
$('climb').addEventListener('change', applyPreset);
['carTabs', 'rideTabs', 'strips'].forEach(id => $(id).addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) { selectedCar = +b.dataset.i; drawSelected(); }
}));
applyPreset();

contarAcesso($('visitCount'));
initContato({ vehicles: VEHICLES, climbs: CLIMBS, currentClimb: () => $('climb').value });

// ---------- Limitações do modelo ----------
// Abre por botão ou pelo endereço com #limitacoes (link usado na divulgação)
const limits = $('limits');
const openLimits = () => { if (!limits.open) limits.showModal(); };
document.querySelectorAll('[data-open-limits]').forEach(b => b.addEventListener('click', openLimits));
limits.querySelectorAll('[data-close-limits]').forEach(b => b.addEventListener('click', () => limits.close()));
limits.addEventListener('click', e => { if (e.target === limits) limits.close(); }); // toque fora fecha
limits.addEventListener('close', () => { if (location.hash === '#limitacoes') history.replaceState(null, '', location.pathname); });
if (location.hash === '#limitacoes') openLimits();
window.addEventListener('hashchange', () => { if (location.hash === '#limitacoes') openLimits(); });
