// Cores e textos dos modos de operação, usados na faixa, nos gráficos e na animação.
// Escala de gravidade: azul (regenerando) → verde-água → ouro → laranja → roxo → vermelho listrado.
// O pior modo leva listras para ser reconhecido mesmo sozinho na faixa, sem
// depender de comparar o tom com o laranja.
export const MODES = {
  REG:  { color: '#4A90D9', ink: '#0b2440', label: 'Regenerando',            short: 'Regenerando', text: 'Descida: o motor elétrico segura o carro e recarrega a bateria.' },
  EV:  { color: '#5DCAA5', ink: '#0b2e24', label: 'Elétrico',               short: 'Elétrico',    text: 'Só a bateria move o carro. Motor a gasolina desligado.' },
  CHG:  { color: '#E8B931', ink: '#2e2205', label: 'Térmico + recarga',      short: 'Recarga',     text: 'O motor a gasolina move o carro e ainda recarrega a bateria.' },
  BAT:  { color: '#E27322', ink: '#2b1405', label: 'Térmico + bateria',      short: 'Térm.+bat.',  text: 'Térmico no máximo, com a bateria complementando a força.' },
  WEAK: { color: '#7F77DD', ink: '#ffffff', label: 'Sem fôlego na retomada', short: 'Sem fôlego',  text: 'Mantém a velocidade, mas não entrega a aceleração pedida nas retomadas.' },
  LIM:  { color: '#D62828', stripe: '#5C0B16', ink: '#ffffff', label: 'Velocidade cai', short: 'Perdendo vel.', text: 'Nem a velocidade de cruzeiro se sustenta nesta inclinação.' }
};

// Preenchimento CSS do modo: cor lisa ou listras diagonais
export const cssFill = m => m.stripe
  ? `repeating-linear-gradient(135deg, ${m.color} 0 5px, ${m.stripe} 5px 9px)`
  : m.color;

// Preenchimento para canvas: cor lisa ou padrão listrado
export function canvasFill(ctx, m) {
  if (!m.stripe) return m.color;
  const s = 9, tile = document.createElement('canvas');
  tile.width = tile.height = s;
  const t = tile.getContext('2d');
  t.fillStyle = m.color; t.fillRect(0, 0, s, s);
  t.strokeStyle = m.stripe; t.lineWidth = 3.5;
  t.beginPath();
  for (const o of [-s, 0, s]) { t.moveTo(o, s); t.lineTo(o + s, 0); }
  t.stroke();
  return ctx.createPattern(tile, 'repeat');
}
