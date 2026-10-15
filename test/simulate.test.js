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
  for (const id of ['s27', 's24', 'ex5']) {
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

test('limiar mais alto gasta mais gasolina', () => {
  const low = run('s27', 'cj', { threshold: 25 });
  const high = run('s27', 'cj', { soc0: 60, threshold: 50 });
  assert.ok(high.fuelL > low.fuelL);
});

test('carga da bateria nunca passa de 100% nem fica negativa', () => {
  const climb = CLIMBS.mant1;
  const p = buildProfile(climb, { L: 23, G: 1152 });
  for (const v of VEHICLES) {
    const r = simulate({ ...v }, p.segments, { startAlt: climb.alt0, soc0: 15, threshold: 15, speedKmh: 100, extraKg: 500, style: 'f' });
    for (const pt of r.points) assert.ok(pt.soc >= 0 && pt.soc <= 100, `${v.id} soc=${pt.soc}`);
  }
});
