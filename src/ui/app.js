import { VEHICLES } from '../model/vehicles.js';
import { CLIMBS, totals, buildProfile } from '../model/climbs.js';
import { simulate, summarize } from '../model/simulate.js';
import { DRIVING_STYLES } from '../model/config.js';

const MODE_COLORS = { EV: '#5DCAA5', CHG: '#eda100', BAT: '#eb6834', WEAK: '#7F77DD', LIM: '#e34948' };
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
  $('carTabs').innerHTML = cars.map((c, i) => `<button data-i="${i}">${c.name}</button>`).join('');
  $('socLegend').innerHTML = cars.map(c => `<span><i style="background:${c.color}"></i>${c.name}</span>`).join('') +
    '<span><i style="background:#898781"></i>Limiar</span>';
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
    soc0: +$('soc0').value, threshold: +$('threshold').value,
    speedKmh: +$('speed').value, extraKg: +$('extra').value, style: $('style').value
  };
}

// ---------- Gráficos ----------
const tick = '#898781';
const grid = matchMedia('(prefers-color-scheme: dark)').matches ? '#2c2c2a' : '#e1e0d9';
function makeChart(id, yTitle, unit) {
  return new Chart($(id), {
    type: 'line', data: { datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        title: t => t[0].parsed.x.toFixed(1) + ' km',
        label: i => `${i.dataset.label}: ${Math.round(i.parsed.y)}${unit}` } } },
      elements: { point: { radius: 0 }, line: { borderWidth: 1.5 } },
      scales: {
        x: { type: 'linear', min: 0, title: { display: true, text: 'km', color: tick }, ticks: { color: tick, maxTicksLimit: 8 }, grid: { display: false } },
        y: { title: { display: true, text: yTitle, color: tick }, ticks: { color: tick }, grid: { color: grid } }
      }
    }
  });
}
const altChart = makeChart('altChart', 'm', ' m');
const socChart = makeChart('socChart', '% de carga', '%');
const powerChart = makeChart('powerChart', 'kW', ' kW');
socChart.options.scales.y.min = 0;
socChart.options.scales.y.max = 100;

// ---------- Execução ----------
function run() {
  const inp = readInputs();
  const profile = buildProfile(inp.climb, inp);
  const opts = { startAlt: profile.startAlt, soc0: inp.soc0, threshold: inp.threshold, speedKmh: inp.speedKmh, extraKg: inp.extraKg, style: inp.style };
  results = cars.map(c => simulate(c, profile.segments, opts));

  $('approachOut').textContent = `${inp.approach} km`;
  $('lengthOut').textContent = `${fmt1(inp.L)} km`;
  $('gainOut').textContent = `${inp.G} m`;
  $('soc0Out').textContent = `${inp.soc0}%`;
  $('thresholdOut').textContent = `${inp.threshold}%`;
  $('speedOut').textContent = `${inp.speedKmh} km/h`;
  $('extraOut').textContent = `${inp.extraKg} kg`;
  const gradeText = inp.climb.segments
    ? `Inclinações de ${fmt1(Math.min(...profile.grades))}% a ${fmt1(Math.max(...profile.grades))}%`
    : `Serra com média de ${fmt1(inp.G / (inp.L * 10))}%`;
  $('info').textContent = `${gradeText}, de ~${Math.round(profile.serraStartAlt)} m a ~${Math.round(profile.topAlt)} m. Total: ${fmt1(profile.totalKm)} km. ${inp.climb.note}.`;
  $('endKm').textContent = `${fmt1(profile.totalKm)} km`;
  [altChart, socChart, powerChart].forEach(ch => (ch.options.scales.x.max = +profile.totalKm.toFixed(1)));

  altChart.data.datasets = [{ label: 'Altitude', borderColor: '#888780', backgroundColor: 'rgba(136,135,128,0.12)', fill: true,
    data: [{ x: 0, y: profile.startAlt }].concat(results[0].points.filter((p, j) => j % 2 === 1).map(p => ({ x: p.km, y: p.alt }))) }];
  altChart.update();

  socChart.data.datasets = cars.map((c, i) => ({ label: c.name, borderColor: c.color, borderDash: c.dash, borderWidth: 2,
    data: results[i].points.filter((p, j) => j % 2 === 0).map(p => ({ x: p.km, y: p.soc })) }))
    .concat([{ label: 'Limiar', borderColor: '#898781', borderWidth: 1, borderDash: [2, 3], data: [{ x: 0, y: inp.threshold }, { x: profile.totalKm, y: inp.threshold }] }]);
  socChart.update();

  $('cards').innerHTML = cars.map((c, i) => {
    const s = summarize(results[i], inp.speedKmh);
    return `<div class="card"><h3>${c.name}${c.id === 's24' ? ` (${fmt1(c.battery)} kWh)` : ''}</h3>
      <p class="big">${Math.round(s.finalSoc)}% <span style="font-size:13px;font-weight:400">no topo</span></p>
      <p>${fmt1(s.fuelL)} L de gasolina · ${fmt1(s.evKm)} km elétrico</p>
      <p class="${s.weakKm > 0 ? 'bad' : ''}">Sem fôlego: ${fmt1(s.weakKm)} km</p>
      <p class="${s.speedDropped ? 'bad' : ''}">Velocidade mínima: ${Math.round(s.minSpeed)} km/h</p></div>`;
  }).join('');
  drawSelected();
}

function drawSelected() {
  const pts = results[selectedCar].points;
  let html = '';
  for (let i = 0; i < pts.length;) {
    let j = i;
    while (j < pts.length && pts[j].mode === pts[i].mode) j++;
    html += `<div style="flex:${j - i};background:${MODE_COLORS[pts[i].mode]}"></div>`;
    i = j;
  }
  $('strip').innerHTML = html;
  powerChart.data.datasets = [
    { label: 'Máximo disponível', borderColor: '#5F5E5A', data: pts.map(p => ({ x: p.km, y: p.pAvail })) },
    { label: 'Pedida', borderColor: '#898781', borderDash: [6, 4], data: pts.map(p => ({ x: p.km, y: p.pWanted })) },
    { label: 'Motor térmico', borderColor: '#eda100', data: pts.map(p => ({ x: p.km, y: p.pEngine })) },
    { label: 'Bateria', borderColor: '#1baf7a', data: pts.map(p => ({ x: p.km, y: p.pBattery })) }
  ];
  powerChart.update();
  document.querySelectorAll('#carTabs button').forEach((b, i) => b.classList.toggle('active', i === selectedCar));
}

fillSelects();
['approach', 'length', 'gain', 'soc0', 'threshold', 'speed', 'extra'].forEach(id => $(id).addEventListener('input', run));
['style', 'b24'].forEach(id => $(id).addEventListener('change', run));
$('climb').addEventListener('change', applyPreset);
$('carTabs').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) { selectedCar = +b.dataset.i; drawSelected(); }
});
applyPreset();
