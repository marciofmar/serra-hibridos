// Fichas dos veículos. "src" indica de onde veio cada número; "est" marca estimativas.
// Potências em kW, massas em kg (ordem de marcha), baterias em kWh.

export const VEHICLES = [
  {
    id: 's27',
    name: 'Song Plus 2027',
    mass: 1950,        // est: faixa 1.700–2.100 kg das versões DM-i, bateria maior
    cd: 0.32,          // est: valor típico de SUV, sem Cd publicado
    width: 1.89, height: 1.68,
    battery: 26.6,     // src: BYD Brasil
    engineKW: 96,      // src: 1.5 turbo de 130 cv (Motorshow)
    turbo: true,
    motorKW: 150,      // src: 204 cv (Motorshow)
    systemKW: 176,     // src: 239 cv combinados (BYD Brasil)
    engineEff: 0.38,   // est: eficiência média de operação
    evFloor: 20,       // src: Automotive Business, "o modo elétrico atua até 20% de bateria"
    color: '#2a78d6', dash: []
  },
  {
    id: 's24',
    name: 'Song Plus 2024',
    mass: 1700,        // src: Ficha Completa / Motorshow (versão 8,3 kWh)
    cd: 0.32,          // est
    width: 1.89, height: 1.68,
    battery: 8.3,      // src: Ficha Completa; versão 2024/25 tem 18,3 kWh (Canal VE)
    engineKW: 81,      // src: 1.5 aspirado de 110 cv
    turbo: false,
    motorKW: 132,      // src: 179 cv
    systemKW: 173,     // src: 235 cv combinados
    engineEff: 0.38,   // est
    evFloor: 25,       // src: relato do dono; Revista Carro (só HEV abaixo de 26%); Reclame Aqui (térmico entra com 25%)
    color: '#e87ba4', dash: [2, 3],
    batteryOptions: [
      { battery: 8.3, mass: 1700, label: '8,3 kWh (versão até 2024)' },
      { battery: 18.3, mass: 1780, label: '18,3 kWh (versão 2024/2025)' } // massa est
    ]
  },
  {
    id: 'ex5',
    name: 'EX5 EM-i Ultra',
    mass: 1844,        // src: Canal VE
    cd: 0.288,         // src: Geely (site oficial do EX5 EM-i)
    width: 1.905, height: 1.685,
    battery: 29.8,     // src: Canal VE / Webmotors
    engineKW: 75,      // src: 102 cv, ficha brasileira (Verificar Auto)
    turbo: false,
    motorKW: 160,      // src: Webmotors
    systemKW: 193,     // src: 262 cv combinados
    engineEff: 0.40,   // est: Geely declara 46,5% de pico
    evFloor: 20,       // src: Motor Show, bateria usada "até os cerca de 20% mínimos" no modo híbrido
    color: '#6250d6', dash: [6, 4]
  },
  {
    // Elétrico de autonomia estendida: o 1.5 só gera energia e nunca move as rodas.
    // O modelo já usa o caminho série (térmico → gerador → motor) para todos os carros.
    id: 'c10',
    name: 'C10 REEV',
    mass: 1976,        // src: Nona Marcha (ficha brasileira)
    cd: 0.30,          // est: sem Cd publicado; SUV de linhas suaves
    width: 1.90, height: 1.68, // src: Nona Marcha
    battery: 28.4,     // src: Nona Marcha / Voltarapida (LFP)
    engineKW: 65,      // src: 1.5 aspirado de 88 cv (Nona Marcha, Voltarapida)
    turbo: false,
    motorKW: 158,      // src: 215 cv no eixo traseiro (Nona Marcha)
    systemKW: 158,     // est: só o motor elétrico traciona, então o teto é o dele
    engineEff: 0.38,   // est: igual aos aspirados BYD
    evFloor: 25,       // src: modo EV liga o gerador em 25% (Voltarapida); Mecânica Online cita cerca de 30%
    color: '#a0682a', dash: [8, 3, 2, 3]
  }
];
