import { FLAT_GRADE } from './config.js';

// Subidas pré-configuradas.
// - segments: perfil real por trechos [[km, %], ...]
// - L/G: extensão (km) e desnível (m) quando só há o total
// - alt0: altitude aproximada no início (m)
// - approach: km de trecho plano antes da serra
// - flat: rampa constante em vez dos três terços
export const CLIMBS = {
  grj:   { group: 'Rio de Janeiro', name: 'Grajaú → topo (perfil por trechos)', alt0: 22,
           segments: [[1, 3.8], [1, 7.5], [1, 8.0], [1, 7.0], [0.5, 5.4]],
           note: 'Perfil por trechos enviado pelo usuário, até a Cabana da Serra', defaultSpeed: 50 },
  jcg:   { group: 'Rio de Janeiro', name: 'Jacarepaguá → topo, desde o Cardoso Fontes', alt0: 101,
           segments: [[1, 5.4], [1, 6.5], [1, 6.5], [0.5, 5.4]],
           note: 'Perfil por trechos enviado pelo usuário, até a Cabana da Serra', defaultSpeed: 50 },
  jcgf:  { group: 'Rio de Janeiro', name: 'Jacarepaguá → topo, desde a Freguesia', alt0: 38,
           segments: [[1.4, 4.5], [1, 5.4], [1, 6.5], [1, 6.5], [0.5, 5.4]],
           note: 'Perfil por trechos enviado pelo usuário, com a aproximação pela Estrada dos Três Rios', defaultSpeed: 50 },
  petro: { group: 'Rio de Janeiro', name: 'Petrópolis – BR-040 (estimativa)', L: 18.7, G: 800, alt0: 50,
           note: 'Extensão medida até o portal; desnível estimado' },
  fbg:   { group: 'Rio de Janeiro', name: 'Nova Friburgo – RJ-116', L: 16.2, G: 832, alt0: 256, note: 'Dado de ciclistas (Aventrilha)' },
  cj:    { group: 'São Paulo', name: 'Campos do Jordão – SP-123', L: 19.8, G: 1009, alt0: 570, approach: 25,
           note: 'Serra Nova, dado de ciclistas (Aventrilha), com 25 km de vale antes' },
  imig:  { group: 'São Paulo', name: 'Imigrantes – Serra do Mar', L: 11.5, G: 730, alt0: 0, flat: true,
           note: 'Rampa de projeto de 6,5% constante (estudo de frenagem)' },
  mogi:  { group: 'São Paulo', name: 'Mogi–Bertioga', L: 12, G: 767, alt0: 0, note: 'Dado de ciclistas (Pedal.com.br)' },
  mant2: { group: 'São Paulo', name: 'Mantiqueira – Cruzeiro a Passa Quatro', L: 11, G: 926, alt0: 520, note: 'Dado de ciclistas (Pedal.com.br)' },
  mant1: { group: 'RJ / Minas', name: 'Mantiqueira – Eng. Passos a Itamonte', L: 23, G: 1152, alt0: 533, note: 'Dado de ciclistas (Pedal.com.br)' },
  graciosa: { group: 'Paraná', name: 'Serra da Graciosa', L: 11.1, G: 724, alt0: 60, note: 'Dado de ciclistas (Pedal.com.br)' },
  br277: { group: 'Paraná', name: 'BR-277 – Serra do Mar (Paranaguá)', L: 21.7, G: 895, alt0: 10, note: 'Dado de ciclistas (Pedal.com.br)' },
  rastro: { group: 'Santa Catarina / RS', name: 'Serra do Rio do Rastro', L: 12.5, G: 1030, alt0: 430,
            note: 'Dado de ciclistas (Pedal.com.br); outra medição dá 13,9 km e 944 m' },
  rocinha: { group: 'Santa Catarina / RS', name: 'Serra da Rocinha – BR-285', L: 14.2, G: 1022, alt0: 200, note: 'Dado de ciclistas (Aventrilha)' },
  dona:  { group: 'Santa Catarina / RS', name: 'Serra Dona Francisca', L: 10, G: 680, alt0: 100, note: 'Dado de ciclistas (Pedal.com.br)' }
};

// Totais de um perfil por trechos.
export function totals(climb) {
  if (!climb.segments) return { L: climb.L, G: climb.G };
  const L = climb.segments.reduce((a, [l]) => a + l, 0);
  const G = climb.segments.reduce((a, [l, g]) => a + l * g * 10, 0);
  return { L: Math.round(L * 10) / 10, G: Math.round(G) };
}

// Monta a lista de segmentos [[km, %], ...] a partir do preset e dos ajustes do usuário.
// Perfis por trechos são esticados proporcionalmente; os demais viram três terços.
export function buildProfile(climb, { L, G, approach = 0 }) {
  let core;
  if (climb.segments) {
    const base = totals(climb);
    const kL = L / base.L;
    const kG = (G / base.G) / kL;
    core = climb.segments.map(([l, g]) => [l * kL, g * kG]);
  } else {
    const g = G / (L * 10);
    core = climb.flat
      ? [[L, g]]
      : [[L / 3, Math.max(0, g - 1.5)], [L / 3, g], [L / 3, g + 1.5]];
  }
  const segments = (approach > 0 ? [[approach, FLAT_GRADE]] : []).concat(core);
  return {
    segments,
    totalKm: approach + L,
    startAlt: climb.alt0,                                   // início do percurso (usar na simulação)
    serraStartAlt: climb.alt0 + approach * FLAT_GRADE * 10, // pé da serra
    topAlt: climb.alt0 + approach * FLAT_GRADE * 10 + G,
    grades: core.map(([, g]) => g)
  };
}
