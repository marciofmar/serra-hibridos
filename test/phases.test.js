import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLES } from '../src/model/vehicles.js';
import { CLIMBS, totals, buildProfile } from '../src/model/climbs.js';
import { simulate } from '../src/model/simulate.js';
import { phases } from '../src/model/phases.js';

const sim = (carId, climbId, opts = {}) => {
  const climb = CLIMBS[climbId];
  const t = totals(climb);
  const profile = buildProfile(climb, { L: t.L, G: t.G, approach: climb.approach || 0 });
  const o = { startAlt: profile.startAlt, soc0: 50, threshold: 25, speedKmh: 60, extraKg: 150, style: 'f', ...opts };
  return simulate({ ...VEHICLES.find(v => v.id === carId) }, profile.segments, o);
};

test('fases cobrem o percurso inteiro, sem buracos nem fases vizinhas iguais', () => {
  const { points } = sim('s24', 'cj');
  const ph = phases(points);
  assert.equal(ph[0].startIdx, 0);
  assert.equal(ph.at(-1).endIdx, points.length - 1);
  for (let k = 1; k < ph.length; k++) {
    assert.equal(ph[k].startIdx, ph[k - 1].endIdx + 1);
    assert.notEqual(ph[k].mode, ph[k - 1].mode);
  }
});

test('retomadas sem fôlego aparecem como fase, mesmo alternando com o cruzeiro', () => {
  const ph = phases(sim('s24', 'cj', { threshold: 15 }).points);
  assert.ok(ph.some(f => f.mode === 'WEAK'));
});

test('bateria cheia na Grajaú dá uma fase só, elétrica', () => {
  const ph = phases(sim('s27', 'grj', { soc0: 100, style: 'c' }).points);
  assert.deepEqual(ph.map(f => f.mode), ['EV']);
});
