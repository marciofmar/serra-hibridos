import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLES } from '../src/model/vehicles.js';
import { CLIMBS, totals, buildProfile } from '../src/model/climbs.js';
import { simulate, summarize } from '../src/model/simulate.js';

const car = id => ({ ...VEHICLES.find(v => v.id === id) });
const run = (carId, climbId, opts = {}) => {
  const climb = CLIMBS[climbId];
  const t = totals(climb);
  const profile = buildProfile(climb, { L: t.L, G: t.G, approach: climb.approach || 0 });
  const o = { startAlt: profile.startAlt, soc0: 50, threshold: 25, speedKmh: 80, extraKg: 150, style: 'n', ...opts };
  return summarize(simulate(car(carId), profile.segments, o), o.speedKmh);
};

test('perfil por trechos da Grajaú soma 4,5 km e 290 m', () => {
  assert.deepEqual(totals(CLIMBS.grj), { L: 4.5, G: 290 });
});

test('esticar um perfil por trechos preserva o desnível pedido', () => {
  const p = buildProfile(CLIMBS.grj, { L: 9, G: 580, approach: 0 });
  const gain = p.segments.reduce((a, [l, g]) => a + l * g * 10, 0);
  assert.ok(Math.abs(gain - 580) < 1);
  assert.ok(Math.abs(p.totalKm - 9) < 1e-9);
});

test('três terços mantêm a média da serra', () => {
  const p = buildProfile(CLIMBS.rocinha, { L: 14.2, G: 1022, approach: 0 });
  const gain = p.segments.reduce((a, [l, g]) => a + l * g * 10, 0);
  assert.ok(Math.abs(gain - 1022) < 1);
});

test('bateria cheia sobe a Grajaú inteira no elétrico', () => {
  for (const id of ['s27', 's24', 'ex5', 'c10']) {
    const s = run(id, 'grj', { soc0: 100, speedKmh: 50, style: 'c' });
    assert.equal(s.fuelL, 0, id);
  }
});

test('Song 2024 fica mais tempo sem fôlego que o Song 2027 com ultrapassagens', () => {
  const s24 = run('s24', 'cj', { style: 'f' });
  const s27 = run('s27', 'cj', { style: 'f' });
  assert.ok(s24.weakKm > s27.weakKm, `s24=${s24.weakKm} s27=${s27.weakKm}`);
});

test('limiar de 50% elimina a falta de fôlego em Campos do Jordão', () => {
  for (const id of ['s27', 's24', 'ex5']) {
    const s = run(id, 'cj', { style: 'f', soc0: 60, threshold: 50 });
    assert.equal(s.weakKm, 0, id);
  }
});

test('gerador do C10 não segura a carga numa serra longa a 80 km/h com ultrapassagens', () => {
  // 88 cv aspirado, só gerando: a bateria cai abaixo do limiar escolhido (Motor Show relata o mesmo)
  const climb = CLIMBS.cj, t = totals(climb);
  const p = buildProfile(climb, { L: t.L, G: t.G, approach: climb.approach });
  const r = simulate(car('c10'), p.segments, { startAlt: p.startAlt, soc0: 60, threshold: 50, speedKmh: 80, style: 'f' });
  assert.ok(r.points.at(-1).soc < 40, `terminou com ${r.points.at(-1).soc}`);
});

test('limiar mais alto gasta mais gasolina', () => {
  const low = run('s27', 'cj', { threshold: 25 });
  const high = run('s27', 'cj', { soc0: 60, threshold: 50 });
  assert.ok(high.fuelL > low.fuelL);
});

test('sem limiar escolhido, o térmico liga no piso elétrico de fábrica de cada carro', () => {
  const climb = CLIMBS.cj;
  const t = totals(climb);
  const p = buildProfile(climb, { L: t.L, G: t.G, approach: climb.approach });
  for (const v of VEHICLES) {
    const r = simulate({ ...v }, p.segments, { startAlt: p.startAlt, soc0: 60, speedKmh: 60, style: 'c' });
    assert.equal(r.threshold, v.evFloor, v.id);
    // Pode ligar um pouco antes (bateria fraca perto do piso), nunca depois
    const lowestEv = Math.min(...r.points.filter(pt => pt.mode === 'EV').map(pt => pt.soc));
    assert.ok(lowestEv > v.evFloor - 0.5, `${v.id} rodou elétrico até ${lowestEv}`);
  }
});

test('curva da bateria do Song 2024 continua a calibrada (zero em 20%, plena em 50%)', () => {
  const s24 = VEHICLES.find(v => v.id === 's24');
  const p = buildProfile(CLIMBS.grj, { L: 4.5, G: 290, approach: 0 });
  const opts = { startAlt: p.startAlt, soc0: 45, speedKmh: 60, style: 'f' };
  const a = simulate({ ...s24 }, p.segments, opts);
  const b = simulate({ ...s24, evFloor: undefined }, p.segments, opts); // padrão 25%
  assert.deepEqual(a.points.map(x => x.mode), b.points.map(x => x.mode));
});

test('carga da bateria nunca passa de 100% nem fica negativa', () => {
  const climb = CLIMBS.mant1;
  const p = buildProfile(climb, { L: 23, G: 1152 });
  for (const v of VEHICLES) {
    const r = simulate({ ...v }, p.segments, { startAlt: climb.alt0, soc0: 15, threshold: 15, speedKmh: 100, extraKg: 500, style: 'f' });
    for (const pt of r.points) assert.ok(pt.soc >= 0 && pt.soc <= 100, `${v.id} soc=${pt.soc}`);
  }
});
