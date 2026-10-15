// Cores e textos dos modos de operação, usados na faixa, nos gráficos e na animação
export const MODES = {
  EV:   { color: '#5DCAA5', label: 'Elétrico',               short: 'Elétrico',    text: 'Só a bateria move o carro. Motor a gasolina desligado.' },
  CHG:  { color: '#eda100', label: 'Térmico + recarga',      short: 'Recarga',     text: 'O motor a gasolina move o carro e ainda recarrega a bateria.' },
  BAT:  { color: '#eb6834', label: 'Térmico + bateria',      short: 'Térm.+bat.',  text: 'Térmico no máximo, com a bateria complementando a força.' },
  WEAK: { color: '#7F77DD', label: 'Sem fôlego na retomada', short: 'Sem fôlego',  text: 'Mantém a velocidade, mas não entrega a aceleração pedida nas retomadas.' },
  LIM:  { color: '#e34948', label: 'Velocidade cai',         short: 'Perdendo vel.', text: 'Nem a velocidade de cruzeiro se sustenta nesta inclinação.' }
};
