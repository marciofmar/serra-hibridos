// Cores e textos dos modos de operação, usados na faixa, nos gráficos e na animação.
// Escala de gravidade: verde-água → ouro → laranja → roxo → vinho. As três primeiras
// são claras (texto escuro); as duas piores são escuras (texto branco), e o vinho
// se separa do laranja pela luminosidade, não só pelo tom.
export const MODES = {
  EV:   { color: '#5DCAA5', ink: '#0b2e24', label: 'Elétrico',               short: 'Elétrico',    text: 'Só a bateria move o carro. Motor a gasolina desligado.' },
  CHG:  { color: '#E8B931', ink: '#2e2205', label: 'Térmico + recarga',      short: 'Recarga',     text: 'O motor a gasolina move o carro e ainda recarrega a bateria.' },
  BAT:  { color: '#E27322', ink: '#2b1405', label: 'Térmico + bateria',      short: 'Térm.+bat.',  text: 'Térmico no máximo, com a bateria complementando a força.' },
  WEAK: { color: '#7F77DD', ink: '#ffffff', label: 'Sem fôlego na retomada', short: 'Sem fôlego',  text: 'Mantém a velocidade, mas não entrega a aceleração pedida nas retomadas.' },
  LIM:  { color: '#A3203F', ink: '#ffffff', label: 'Velocidade cai',         short: 'Perdendo vel.', text: 'Nem a velocidade de cruzeiro se sustenta nesta inclinação.' }
};
