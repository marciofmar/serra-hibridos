import { FLAT_GRADE } from './config.js';

// Subidas pré-configuradas.
// - segments: perfil real por trechos [[km, %], ...], a partir do pé da serra
// - L/G: extensão (km) e desnível (m) quando só há o total
// - alt0: altitude no pé da serra, onde começam os segments (m)
// - approach: km de aproximação antes da serra (o usuário pode zerar)
// - approachGrade: inclinação da aproximação (%); sem ela, FLAT_GRADE
// - flat: rampa constante em vez dos três terços
// Perfis por trechos de data/: inclinação de cada trecho = diferença de altitude / extensão.
export const CLIMBS = {
  // ---------- Rio de Janeiro ----------
  grj:   { group: 'Rio de Janeiro', name: 'Grajaú → topo (perfil por trechos)', alt0: 22,
           segments: [[1, 3.8], [1, 7.5], [1, 8.0], [1, 7.0], [0.5, 5.4]],
           note: 'Perfil por trechos enviado pelo usuário, até a Cabana da Serra', defaultSpeed: 50 },
  jcg:   { group: 'Rio de Janeiro', name: 'Jacarepaguá → topo, desde o Cardoso Fontes', alt0: 101,
           segments: [[1, 5.4], [1, 6.5], [1, 6.5], [0.5, 5.4]],
           note: 'Perfil por trechos enviado pelo usuário, até a Cabana da Serra', defaultSpeed: 50 },
  jcgf:  { group: 'Rio de Janeiro', name: 'Jacarepaguá → topo, desde a Freguesia', alt0: 38,
           segments: [[1.4, 4.5], [1, 5.4], [1, 6.5], [1, 6.5], [0.5, 5.4]],
           note: 'Perfil por trechos enviado pelo usuário, com a aproximação pela Estrada dos Três Rios', defaultSpeed: 50 },
  petro: { group: 'Rio de Janeiro', name: 'Petrópolis – BR-040: Xerém → Quitandinha', alt0: 45,
           segments: [[4, 4.25], [4, 4.75], [4, 4.75], [4, 4.25], [2.7, 3.33]],
           note: 'Pista de subida, do pedágio de Xerém (KM 102) ao Portal Quitandinha (KM 83); parte mais dura do KM 4 ao 12, nas curvas em pedra até os túneis' },
  fbg:   { group: 'Rio de Janeiro', name: 'Nova Friburgo – RJ-116: Boca do Mato → Mury', alt0: 135,
           segments: [[4.5, 4.56], [5, 4.5], [5, 4.5], [4.5, 4.11], [3, 3.33]],
           note: 'Sentido sul–norte, do pedágio de Boca do Mato (KM 49) ao alto da serra antes de Mury (KM 71)' },
  fbgN:  { group: 'Rio de Janeiro', name: 'Nova Friburgo – RJ-116: Centro de Friburgo → Mury (sentido contrário)', alt0: 846,
           segments: [[5, 1.98], [4.5, 2.89]],
           note: 'Sentido norte–sul, do Centro de Nova Friburgo (KM 80,5) ao alto da serra (KM 71); subida curta e suave' },

  // ---------- São Paulo ----------
  cj:    { group: 'São Paulo', name: 'Campos do Jordão – SP-123: Piracuama → Vista Chinesa', alt0: 600,
           segments: [[3, 5.2], [2, 7.1], [3, 6.8], [2, 2.4], [2, 4.2], [2, 6.55], [4.2, 4.29]],
           note: 'Serra Nova, da base da PRF em Piracuama ao alto da serra; parte mais dura do KM 3 ao 8, no túnel e no viaduto Santo Antônio' },
  cjt:   { group: 'São Paulo', name: 'Campos do Jordão – SP-123: Piracuama → Hotel Toriba (variante)', alt0: 600,
           segments: [[3, 5.2], [2, 7.1], [3, 6.8], [2, 2.4], [2, 4.2], [2, 6.55], [5.2, 6.63]],
           note: 'Mesma subida até a bifurcação do KM 14, depois a variante do Hotel Toriba, com rampas de até 15% (o perfil mostra a média de 6,6%)' },
  imig:  { group: 'São Paulo', name: 'Imigrantes – SP-160: Cubatão → Planalto', alt0: 15,
           segments: [[3.5, 5.14], [3.5, 5.71], [3.5, 5.71], [3.5, 4.86]],
           note: 'Pista norte, de Cubatão (KM 58) ao planalto em São Bernardo (KM 44), com 11 túneis' },
  mogi:  { group: 'São Paulo', name: 'Mogi–Bertioga – SP-098: Bertioga → Biritiba-Mirim', alt0: 20, approach: 4,
           segments: [[3, 6.5], [3, 7.33], [3, 7.33], [3, 6]],
           note: 'Do pé da serra (KM 90) ao planalto (KM 78), com 4 km de planície antes; parte mais dura do KM 3 ao 9' },

  // ---------- Serra da Mantiqueira ----------
  emb:   { group: 'Mantiqueira (SP / RJ / MG)', name: 'Garganta do Embaú: Cruzeiro (SP) → divisa', alt0: 535,
           segments: [[8, 0.75], [4, 4.5], [4, 5], [3.5, 4.51]],
           note: 'SP-052, de Cruzeiro à divisa SP/MG; 8 km de vale e 11,5 km de serra' },
  embMG: { group: 'Mantiqueira (SP / RJ / MG)', name: 'Garganta do Embaú: Passa Quatro (MG) → divisa', alt0: 915,
           segments: [[7, 0.57], [5.2, 3.42]],
           note: 'MG-158, de Passa Quatro à divisa MG/SP; 7 km quase planos e 5,2 km de subida pelos Manacás' },
  reg:   { group: 'Mantiqueira (SP / RJ / MG)', name: 'Garganta do Registro – BR-354: Eng. Passos (RJ) → divisa', alt0: 475,
           segments: [[5, 3.8], [5, 5], [5, 5.2], [5, 5], [6, 4.07]],
           note: 'Do entroncamento com a Dutra à divisa RJ/MG; a mais longa da lista, 26 km e quase 1.200 m' },
  regMG: { group: 'Mantiqueira (SP / RJ / MG)', name: 'Garganta do Registro – BR-354: Itamonte (MG) → divisa', alt0: 925,
           segments: [[5, 2.6], [5, 3.8], [5, 4.4], [5.2, 3.92]],
           note: 'Vertente mineira, de Itamonte à divisa MG/RJ' },

  // ---------- Paraná ----------
  graciosa: { group: 'Paraná', name: 'Serra da Graciosa – PR-410: São João da Graciosa → Portal', alt0: 45,
           segments: [[4, 3.75], [4, 5.5], [4, 5.5], [4, 5], [3.5, 2.57]],
           note: 'Estrada da Graciosa, com cerca de 8 km de paralelepípedos; parte mais dura do KM 4 ao 12' },
  br277: { group: 'Paraná', name: 'BR-277 – Serra do Mar: Morretes → Borda do Campo', alt0: 40,
           segments: [[5, 3.5], [5, 4.8], [5, 5], [4, 4.5], [3, 2]],
           note: 'Do acesso a Morretes (KM 32) ao planalto (KM 54); parte mais dura entre os viadutos dos Padres e Caruru' },

  // ---------- Santa Catarina / RS ----------
  rastro: { group: 'Santa Catarina / RS', name: 'Serra do Rio do Rastro – SC-390: Lauro Müller → Mirante', alt0: 400,
           approach: 8.3, approachGrade: 2.17,
           segments: [[3, 3.83], [2, 6], [3, 5.5], [2.4, 7.71], [4, 9.5], [1, 2.1]],
           note: '8,3 km de Lauro Müller a Guatá e 15,4 km de serra oficial (zere a aproximação para começar em Guatá); paredão das 284 curvas a 9,5%, com picos de 20%' },
  rocinha: { group: 'Santa Catarina / RS', name: 'Serra da Rocinha – BR-285: Timbé do Sul → divisa SC/RS', alt0: 130,
           approach: 8, approachGrade: 0.44,
           segments: [[3, 7], [3.5, 8.71], [3.5, 9.43], [3, 8.5]],
           note: '8 km de Timbé do Sul ao pé da serra e 13 km de serra a 8,5%, a mais íngreme da lista' },
  dona:  { group: 'Santa Catarina / RS', name: 'Serra Dona Francisca – SC-418: Pirabeiraba → Alto da Serra', alt0: 45,
           segments: [[6, 1.5], [5, 4.1], [4, 8], [2.5, 6.8], [2.5, 1.6]],
           note: 'De Pirabeiraba rumo a Campo Alegre; paredão das 8 curvas de 180° a 8%' },

  // ---------- Rio Grande do Sul: Porto Alegre a Gramado ----------
  gram:  { group: 'Porto Alegre → Gramado', name: 'Rota 1 – RS-115: Três Coroas → Gramado', alt0: 75,
           segments: [[4, 4.25], [4.5, 5.11], [3.5, 5.43], [2.5, 3.8], [4, 1.88]],
           note: 'Subida direta, do pedágio de Três Coroas (KM 24) ao Centro de Gramado; rampas de até 7% nas curvas superiores' },
  gramA: { group: 'Porto Alegre → Gramado', name: 'Rota 2 (Romântica), subida 1 de 3 – BR-116: Dois Irmãos → Morro Reuter', alt0: 160,
           segments: [[5.5, 3.18], [5.5, 2.91]],
           note: 'Primeiro degrau da serra; depois a estrada desce ao vale do rio Cadeia' },
  gramB: { group: 'Porto Alegre → Gramado', name: 'Rota 2 (Romântica), subida 2 de 3 – BR-116: Picada Café → Nova Petrópolis', alt0: 105,
           segments: [[5, 3.8], [5, 3.8], [5, 2.1]],
           note: 'Segundo degrau; depois a RS-235 desce ao vale do rio Caí' },
  gramC: { group: 'Porto Alegre → Gramado', name: 'Rota 2 (Romântica), subida 3 de 3 – RS-235: Linha Araripe → Gramado', alt0: 460,
           segments: [[6, 2.5], [6, 2.25], [6, 1.5]],
           note: 'Terceiro degrau, do pedágio da RS-235 (KM 14) ao pórtico de Gramado' }
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
  const aGrade = climb.approachGrade ?? FLAT_GRADE;
  const segments = (approach > 0 ? [[approach, aGrade]] : []).concat(core);
  const serraStartAlt = climb.alt0;
  return {
    segments,
    totalKm: approach + L,
    startAlt: serraStartAlt - approach * aGrade * 10, // início do percurso (usar na simulação)
    serraStartAlt,                                    // pé da serra
    topAlt: serraStartAlt + G,
    grades: core.map(([, g]) => g)
  };
}
