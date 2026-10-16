import { STEP_M, RETAKE_BLOCK_M } from './config.js';

// Ordem de gravidade: num trecho com mais de um modo, prevalece o mais exigente
const SEVERITY = { REG: -1, EV: 0, CHG: 1, BAT: 2, WEAK: 3, LIM: 4 };

/**
 * Resume os pontos da simulação em fases legíveis para a animação.
 *
 * Os modos alternam dentro de cada bloco de retomada (cruzeiro e aceleração),
 * então cada bloco de RETAKE_BLOCK_M recebe o modo mais exigente que teve
 * (regenerar é o menos exigente: um bloco de descida com retomada vira EV).
 * Blocos vizinhos iguais viram uma fase, e uma fase de um bloco só entre duas
 * fases iguais é absorvida por elas.
 *
 * @param {object[]} points  saída de simulate().points
 * @returns {{ mode, startKm, endKm, startIdx, endIdx, socStart, socEnd }[]}
 */
export function phases(points) {
  const perBlock = Math.max(1, Math.round(RETAKE_BLOCK_M / STEP_M));
  const blocks = [];
  for (let i = 0; i < points.length; i += perBlock) {
    const slice = points.slice(i, i + perBlock);
    const mode = slice.reduce((w, p) => (SEVERITY[p.mode] > SEVERITY[w] ? p.mode : w), slice[0].mode);
    blocks.push({ mode, startIdx: i, endIdx: i + slice.length - 1 });
  }

  const collapse = list => list.reduce((out, b) => {
    const last = out[out.length - 1];
    if (last && last.mode === b.mode) last.endIdx = b.endIdx;
    else out.push({ ...b });
    return out;
  }, []);

  let runs = collapse(blocks);
  runs = collapse(runs.map((r, k) => {
    const prev = runs[k - 1], next = runs[k + 1];
    const single = r.endIdx - r.startIdx + 1 <= perBlock;
    return single && prev && next && prev.mode === next.mode ? { ...r, mode: prev.mode } : r;
  }));

  return runs.map(r => ({
    mode: r.mode,
    startIdx: r.startIdx,
    endIdx: r.endIdx,
    startKm: r.startIdx * STEP_M / 1000,
    endKm: points[r.endIdx].km,
    socStart: r.startIdx > 0 ? points[r.startIdx - 1].soc : points[0].soc,
    socEnd: points[r.endIdx].soc
  }));
}
