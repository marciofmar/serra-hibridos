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

test('perfis enviados pelo usuário batem com extensão e altitudes dos CSVs', () => {
  // [id, km, altitude no pé, altitude no topo] tirados de data/*.csv
  const esperado = [
    ['petro', 18.7, 45, 855], ['fbg', 22, 135, 1075], ['fbgN', 9.5, 846, 1075],
    ['cj', 18.2, 600, 1545],['imig', 14, 15, 765],
    ['mogi', 12, 20, 835], ['emb', 11.5, 595, 1133], ['embMG', 5.2, 955, 1133],
    ['reg', 26, 475, 1669], ['regMG', 20.2, 925, 1669], ['graciosa', 19.5, 45, 925],
    ['br277', 22, 40, 945], ['rastro', 15.4, 400, 1386], ['rocinha', 13, 130, 1230],
    ['dona', 14, 135, 870], ['gram', 18.5, 75, 835], ['gramR', 71, 160, 835],
    ['gramA', 11, 160, 495], ['gramB', 15, 105, 590], ['gramC', 18, 460, 835]
  ];
  for (const [id, km, base, topo] of esperado) {
    const c = CLIMBS[id];
    const t = totals(c);
    assert.equal(t.L, km, id);
    assert.equal(c.alt0, base, id);
    assert.ok(Math.abs(c.alt0 + t.G - topo) <= 2, `${id}: topo ${c.alt0 + t.G}, esperado ${topo}`);
  }
});

test('aproximação com inclinação própria começa na altitude certa', () => {
  const r = { ...CLIMBS.rastro, approachGrade: 2.17 }, t = totals(r);
  const p = buildProfile(r, { ...t, approach: 8.3 });
  assert.ok(Math.abs(p.startAlt - 220) <= 1, `começou em ${p.startAlt}`);
  assert.equal(p.serraStartAlt, 400);
  const semAprox = buildProfile(r, { ...t, approach: 0 });
  assert.equal(semAprox.startAlt, 400);
});

test('patamares e descidas no meio da subida: plano gasta, descida forte regenera', () => {
  const c = CLIMBS.cj, p = buildProfile(c, totals(c));
  const r = simulate(car('s27'), p.segments, { startAlt: p.startAlt, soc0: 80, speedKmh: 60, style: 'c' });
  const trecho = (a, b) => r.points.filter(x => x.km > a && x.km <= b);
  const descida = trecho(9, 10); // −3,1%
  assert.ok(descida.every(x => x.mode === 'REG'), 'descida do KM 9–10 regenera');
  assert.ok(descida.at(-1).soc > descida[0].soc);
  const pp = buildProfile(CLIMBS.petro, totals(CLIMBS.petro));
  const rp = simulate(car('s27'), pp.segments, { startAlt: pp.startAlt, soc0: 80, speedKmh: 60, style: 'c' });
  const plano = rp.points.filter(x => x.km > 13.5 && x.km <= 14.1); // 0,0%
  assert.ok(plano.every(x => x.pBattery > 0 && x.mode === 'EV'), 'alívio plano pós-túneis gasta bateria');
});

test('esticar um perfil por trechos preserva o desnível pedido', () => {
  const p = buildProfile(CLIMBS.grj, { L: 9, G: 580, approach: 0 });
  const gain = p.segments.reduce((a, [l, g]) => a + l * g * 10, 0);
  assert.ok(Math.abs(gain - 580) < 1);
  assert.ok(Math.abs(p.totalKm - 9) < 1e-9);
});

test('três terços mantêm a média da serra', () => {
  const p = buildProfile({ L: 14.2, G: 1022, alt0: 200 }, { L: 14.2, G: 1022, approach: 0 });
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

test('descida forte regenera: carga sobe, sem gasolina, sem passar de 100%', () => {
  for (const v of VEHICLES) {
    const r = simulate({ ...v }, [[5, -6]], { startAlt: 1000, soc0: 50, speedKmh: 60, style: 'c' });
    assert.ok(r.points.at(-1).soc > 50, `${v.id} terminou com ${r.points.at(-1).soc}`);
    assert.equal(r.fuelL, 0, v.id);
    assert.ok(r.points.every(p => p.mode === 'REG' && p.pBattery < 0), v.id);
    const cheia = simulate({ ...v }, [[10, -8]], { startAlt: 1000, soc0: 97, speedKmh: 60, style: 'c' });
    assert.ok(cheia.points.every(p => p.soc <= 100), v.id);
  }
});

test('regeneração não passa do teto: o que sobra vai para os freios', () => {
  const s24 = VEHICLES.find(v => v.id === 's24'); // 8,3 kWh → teto de 33 kW
  const r = simulate({ ...s24 }, [[3, -10]], { startAlt: 1000, soc0: 30, speedKmh: 80, style: 'c' });
  assert.ok(Math.min(...r.points.map(p => p.pBattery)) >= -8.3 * 4 - 1e-9);
});

test('Rota Romântica completa: 71 km, de 160 m a 835 m, com regeneração nas descidas', () => {
  const c = CLIMBS.gramR, t = totals(c);
  assert.equal(t.L, 71);
  assert.ok(Math.abs(c.alt0 + t.G - 835) <= 1);
  const p = buildProfile(c, t);
  const r = simulate(car('s24'), p.segments, { startAlt: p.startAlt, soc0: 50, speedKmh: 60, style: 'c' });
  const at = km => r.points.find(x => x.km >= km).soc;
  assert.ok(at(24) > at(11), 'a carga sobe na descida para Picada Café');
});

test('carga da bateria nunca passa de 100% nem fica negativa', () => {
  const climb = CLIMBS.reg;
  const p = buildProfile(climb, totals(climb));
  for (const v of VEHICLES) {
    const r = simulate({ ...v }, p.segments, { startAlt: p.startAlt, soc0: 15, threshold: 15, speedKmh: 100, extraKg: 500, style: 'f' });
    for (const pt of r.points) assert.ok(pt.soc >= 0 && pt.soc <= 100, `${v.id} soc=${pt.soc}`);
  }
});
