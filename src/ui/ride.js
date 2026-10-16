import { MODES } from './modes.js';
import { phases } from '../model/phases.js';
import { STEP_M } from '../model/config.js';

const fmt1 = x => x.toFixed(1).replace('.', ',');
const fmtInt = x => Math.round(x).toLocaleString('pt-BR');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, f) => a + (b - a) * f;
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Animação do carro subindo o perfil. Recebe os elementos da página e
 * devolve { setData }, chamado sempre que a simulação roda de novo.
 */
export function createRide(el) {
  const { canvas } = el;
  const ctx = canvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let data = null;
  let T = 0, playing = false, rate = 60, lastTs = 0, raf = 0;
  let particles = [], wheel = 0, lastKm = 0, emitAcc = 0;
  let size = { w: 0, h: 0 }, theme = readTheme();
  let shownPhase = -1, shownReached = -1;

  // ---------- Dados ----------
  function setData({ points, car, startAlt }) {
    const keepKm = data ? stateAt(T).km : 0;
    const times = [];
    let t = 0;
    for (const p of points) { t += STEP_M / (p.speedKmh / 3.6); times.push(t); }
    const alts = points.map(p => p.alt).concat(startAlt);
    data = {
      points, car, startAlt, times,
      totalKm: points.length * STEP_M / 1000,
      altMin: Math.min(...alts), altMax: Math.max(...alts),
      phases: phases(points)
    };
    T = timeAtKm(Math.min(keepKm, data.totalKm));
    el.scrub.max = data.totalKm.toFixed(2);
    shownPhase = shownReached = -1;
    renderLog();
    render();
  }

  function stateAt(time) {
    const { times, points, startAlt } = data;
    let lo = 0, hi = times.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (times[mid] < time) lo = mid + 1; else hi = mid; }
    const tPrev = lo ? times[lo - 1] : 0;
    const prev = lo ? points[lo - 1] : { km: 0, alt: startAlt };
    const f = clamp((time - tPrev) / (times[lo] - tPrev), 0, 1);
    const kmPrev = lo * STEP_M / 1000;
    return { i: lo, p: points[lo], km: lerp(kmPrev, kmPrev + STEP_M / 1000, f), alt: lerp(prev.alt, points[lo].alt, f) };
  }

  function timeAtKm(km) {
    const { times } = data;
    const i = clamp(Math.ceil(km * 1000 / STEP_M) - 1, 0, times.length - 1);
    const tPrev = i ? times[i - 1] : 0;
    const f = clamp((km - i * STEP_M / 1000) / (STEP_M / 1000), 0, 1);
    return lerp(tPrev, times[i], f);
  }

  function altAtKm(km) {
    const { points, startAlt } = data;
    const x = clamp(km * 1000 / STEP_M, 0, points.length);
    const i = Math.floor(x), f = x - i;
    const a = i === 0 ? startAlt : points[i - 1].alt;
    const b = points[Math.min(i, points.length - 1)].alt;
    return lerp(a, b, f);
  }

  // ---------- Desenho ----------
  function readTheme() {
    const css = getComputedStyle(document.documentElement);
    const v = n => css.getPropertyValue(n).trim();
    return { sky1: v('--sky-1'), sky2: v('--sky-2'), ground1: v('--ground-1'), ground2: v('--ground-2'),
      road: v('--road'), grid: v('--grid'), muted: v('--muted'), text: v('--text'), surface: v('--surface') };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    size = { w: r.width, h: r.height };
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function scales() {
    const pad = { l: 44, r: 14, t: 46, b: 26 };
    const { altMin, altMax, totalKm } = data;
    const span = Math.max(altMax - altMin, 60);
    const lo = altMin - span * 0.12, hi = altMax + span * 0.06;
    const X = km => pad.l + km / totalKm * (size.w - pad.l - pad.r);
    const Y = alt => size.h - pad.b - (alt - lo) / (hi - lo) * (size.h - pad.t - pad.b);
    return { pad, X, Y, lo, hi };
  }

  function niceStep(range, target) {
    const raw = range / target, mag = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  }

  function draw(st) {
    const { w, h } = size;
    if (!w || !data) return;
    const { points, totalKm, startAlt } = data;
    const { pad, X, Y, lo, hi } = scales();
    ctx.clearRect(0, 0, w, h);

    // Céu
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, theme.sky1); sky.addColorStop(1, theme.sky2);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Grade de altitude
    ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
    ctx.textBaseline = 'middle';
    const aStep = niceStep(hi - lo, 4);
    ctx.strokeStyle = theme.grid; ctx.fillStyle = theme.muted; ctx.lineWidth = 1;
    for (let a = Math.ceil(lo / aStep) * aStep; a <= hi; a += aStep) {
      const y = Math.round(Y(a)) + 0.5;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(fmtInt(a), pad.l - 6, y);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const kStep = niceStep(totalKm, w < 500 ? 4 : 8);
    for (let k = 0; k <= totalKm + 1e-6; k += kStep) if (X(k) < w - pad.r - 28) ctx.fillText(`${fmtInt(k)}`, X(k), h - 8);
    ctx.textAlign = 'right'; ctx.fillText('km', w - pad.r, h - 8);

    // Terreno
    const path = [[X(0), Y(startAlt)]].concat(points.map(p => [X(p.km), Y(p.alt)]));
    const ground = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    ground.addColorStop(0, theme.ground1); ground.addColorStop(1, theme.ground2);
    ctx.beginPath();
    ctx.moveTo(path[0][0], h - pad.b);
    path.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(path[path.length - 1][0], h - pad.b);
    ctx.closePath();
    ctx.fillStyle = ground; ctx.fill();

    // Estrada: cinza adiante, colorida pelo modo no trecho já percorrido
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 6; ctx.strokeStyle = theme.road;
    ctx.beginPath(); path.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();

    const carX = X(st.km), carY = Y(st.alt);
    ctx.lineWidth = 6;
    for (let k = 0; k <= st.i;) {
      let j = k;
      while (j <= st.i && points[j].mode === points[k].mode) j++;
      ctx.strokeStyle = MODES[points[k].mode].color;
      ctx.beginPath();
      ctx.moveTo(...path[k]);
      for (let m = k + 1; m <= j && m <= st.i; m++) ctx.lineTo(...path[m]);
      if (j > st.i) ctx.lineTo(carX, carY);
      ctx.stroke();
      k = j;
    }

    // Marcos de troca de fase já alcançados
    data.phases.forEach((ph, k) => {
      if (k === 0 || ph.startKm > st.km) return;
      const x = X(ph.startKm), y = Y(altAtKm(ph.startKm));
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = MODES[ph.mode].color; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = theme.surface; ctx.stroke();
    });

    // Bandeira no topo
    const fx = X(totalKm), fy = Y(points[points.length - 1].alt);
    ctx.strokeStyle = theme.text; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(fx - 4, fy); ctx.lineTo(fx - 4, fy - 22); ctx.stroke();
    ctx.fillStyle = '#f2b134';
    ctx.beginPath(); ctx.moveTo(fx - 4, fy - 22); ctx.lineTo(fx - 16, fy - 18); ctx.lineTo(fx - 4, fy - 14); ctx.fill();

    // Fumaça do escapamento
    for (const pt of particles) {
      ctx.globalAlpha = 0.35 * pt.life;
      ctx.fillStyle = theme.muted;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 2 + (1 - pt.life) * 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawCar(st, carX, carY, X, Y);
  }

  function carAngle(km, X, Y) {
    const d = 0.25;
    const a = Math.max(0, km - d), b = Math.min(data.totalKm, km + d);
    return Math.atan2(Y(altAtKm(b)) - Y(altAtKm(a)), X(b) - X(a));
  }

  function drawCar(st, x, y, X, Y) {
    const s = size.w < 500 ? 0.85 : 1;
    const ang = carAngle(st.km, X, Y);
    const color = data.car.color;
    const mode = MODES[st.p.mode];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(s, s);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    // carroceria (SUV)
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(-17, -15, 34, 10, 3.5); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14, -14); ctx.lineTo(-11, -22); ctx.lineTo(7, -22); ctx.lineTo(13, -14);
    ctx.closePath(); ctx.fill();
    // janelas
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.moveTo(-11.5, -15); ctx.lineTo(-9.5, -20.2); ctx.lineTo(-2.5, -20.2); ctx.lineTo(-2.5, -15); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.5, -15); ctx.lineTo(-0.5, -20.2); ctx.lineTo(6, -20.2); ctx.lineTo(10, -15); ctx.closePath(); ctx.fill();
    // farol
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(14.5, -12.5, 2.5, 2.5);
    // rodas
    for (const wx of [-10, 10]) {
      ctx.fillStyle = '#1b1d1f';
      ctx.beginPath(); ctx.arc(wx, -4.5, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(wheel) * 3, -4.5 + Math.sin(wheel) * 3);
      ctx.lineTo(wx - Math.cos(wheel) * 3, -4.5 - Math.sin(wheel) * 3);
      ctx.moveTo(wx + Math.cos(wheel + 1.57) * 3, -4.5 + Math.sin(wheel + 1.57) * 3);
      ctx.lineTo(wx - Math.cos(wheel + 1.57) * 3, -4.5 - Math.sin(wheel + 1.57) * 3);
      ctx.stroke();
    }
    ctx.restore();

    // etiqueta do modo acima do carro
    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
    const label = mode.short;
    const tw = ctx.measureText(label).width + 14;
    const lx = clamp(x - tw / 2, 4, size.w - tw - 4);
    const ly = y - 44 * s;
    ctx.fillStyle = mode.color;
    ctx.beginPath(); ctx.roundRect(lx, ly - 10, tw, 20, 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, ly + 9); ctx.lineTo(x + 4, ly + 9); ctx.lineTo(x, ly + 14); ctx.fill();
    ctx.fillStyle = mode.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + tw / 2, ly + 0.5);
  }

  function exhaust(st, dtReal, dKm) {
    if (reduceMotion) { particles = []; return; }
    for (const pt of particles) { pt.x += pt.vx * dtReal; pt.y += pt.vy * dtReal; pt.life -= dtReal / 1.1; }
    particles = particles.filter(pt => pt.life > 0);
    if (!playing || st.p.pEngine <= 0 || dKm <= 0) return;
    const { X, Y } = scales();
    const ang = carAngle(st.km, X, Y), s = size.w < 500 ? 0.85 : 1;
    const ex = X(st.km) + (Math.cos(ang) * -18 - Math.sin(ang) * -6) * s;
    const ey = Y(st.alt) + (Math.sin(ang) * -18 + Math.cos(ang) * -6) * s;
    emitAcc += dtReal * (6 + 30 * st.p.pEngine / data.car.engineKW);
    while (emitAcc >= 1) {
      emitAcc -= 1;
      particles.push({ x: ex, y: ey, vx: -14 - Math.random() * 10, vy: -8 - Math.random() * 10, life: 1 });
    }
  }

  // ---------- Painel de informações ----------
  function updateDom(st) {
    const p = st.p, { car, times, totalKm } = data;
    const set = (k, v) => { const n = el.hud.querySelector(`[data-k="${k}"]`); if (n.textContent !== v) n.textContent = v; };
    set('km', `${fmt1(st.km)} km`);
    set('alt', `${fmtInt(st.alt)} m`);
    set('grade', `${fmt1(p.grade)}%`);
    set('speed', `${Math.round(p.speedKmh)} km/h`);
    set('soc', `${Math.round(p.soc)}%`);
    set('fuel', `${fmt1(p.fuelL)} L`);
    set('engine', `${Math.round(p.pEngine)} kW`);
    set('battery', `${Math.round(Math.abs(p.pBattery))} kW`);
    el.hud.querySelector('[data-k="socbar"]').style.width = `${clamp(p.soc, 0, 100)}%`;
    el.hud.querySelector('[data-k="socbar"]').style.background = car.color;
    el.hud.querySelector('[data-k="batlabel"]').textContent = p.pBattery < -0.5 ? 'Bat. recarrega' : 'Bat. entrega';

    el.scrub.value = st.km.toFixed(2);
    el.scrub.style.setProperty('--p', `${st.km / totalKm * 100}%`);
    el.clock.textContent = `${mmss(Math.min(T, times.at(-1)))} de ${mmss(times.at(-1))}`;

    const k = data.phases.findIndex(ph => st.i >= ph.startIdx && st.i <= ph.endIdx);
    if (k !== shownPhase) {
      shownPhase = k;
      const ph = data.phases[k], m = MODES[ph.mode];
      el.phase.style.setProperty('--mode', m.color);
      el.phase.innerHTML = `<span class="phase-dot"></span><div><strong>${m.label}</strong>
        <span>${m.text}</span><small>Fase ${k + 1} de ${data.phases.length} · desde o km ${fmt1(ph.startKm)}</small></div>`;
    }
    const done = T >= times.at(-1) - 1e-6;
    const reached = done ? data.phases.length : k;
    if (reached !== shownReached) {
      shownReached = reached;
      el.log.querySelectorAll('li').forEach((li, j) => {
        li.classList.toggle('reached', j <= k || done);
        li.classList.toggle('current', j === k && !done);
      });
    }
  }

  function renderLog() {
    const { phases: ph, points } = data;
    const last = points.at(-1);
    el.log.innerHTML = ph.map((f, j) => {
      const m = MODES[f.mode];
      return `<li data-km="${f.startKm}" style="--mode:${m.color}"><button type="button">
        <span class="log-km">km ${fmt1(f.startKm)}</span><span class="log-dot"></span>
        <span class="log-txt">${m.label}<small>bateria ${Math.round(f.socStart)}% → ${Math.round(f.socEnd)}% · ${fmt1(f.endKm - f.startKm)} km</small></span>
      </button></li>`;
    }).join('') + `<li data-km="${data.totalKm}" class="log-end" style="--mode:#f2b134"><button type="button">
      <span class="log-km">km ${fmt1(data.totalKm)}</span><span class="log-dot"></span>
      <span class="log-txt">Chegada ao topo<small>bateria ${Math.round(last.soc)}% · ${fmt1(last.fuelL)} L de gasolina</small></span></button></li>`;
  }

  // ---------- Laço da animação ----------
  function render() {
    if (!data) return;
    const st = stateAt(T);
    draw(st);
    updateDom(st);
  }

  function frame(ts) {
    const dt = Math.min(0.25, (ts - lastTs) / 1000);
    lastTs = ts;
    const end = data.times.at(-1);
    if (playing) {
      T = Math.min(end, T + dt * rate);
      if (T >= end) setPlaying(false);
    }
    const st = stateAt(T);
    const dKm = st.km - lastKm;
    lastKm = st.km;
    wheel += dKm * 900;
    exhaust(st, dt, dKm);
    draw(st);
    updateDom(st);
    raf = playing || particles.length ? requestAnimationFrame(frame) : 0;
  }

  function kick() {
    if (raf) return;
    lastTs = performance.now();
    lastKm = data ? stateAt(T).km : 0;
    raf = requestAnimationFrame(frame);
  }

  function setPlaying(on) {
    playing = on;
    el.play.classList.toggle('playing', on);
    el.play.setAttribute('aria-label', on ? 'Pausar' : 'Reproduzir');
    el.play.querySelector('span').textContent = on ? 'Pausar' : 'Subir';
    if (on) kick();
  }

  // ---------- Controles ----------
  el.play.addEventListener('click', () => {
    if (!data) return;
    if (!playing && T >= data.times.at(-1) - 1e-6) T = 0;
    setPlaying(!playing);
  });
  el.restart.addEventListener('click', () => { T = 0; particles = []; render(); });
  el.scrub.addEventListener('input', () => { T = timeAtKm(+el.scrub.value); lastKm = +el.scrub.value; render(); });
  el.rate.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    rate = +b.dataset.rate;
    el.rate.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
  });
  el.log.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    T = timeAtKm(Math.min(+li.dataset.km + 0.001, data.totalKm));
    render();
  });
  new ResizeObserver(resize).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { theme = readTheme(); render(); });

  return { setData };
}
