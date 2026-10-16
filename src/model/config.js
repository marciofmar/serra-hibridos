// Premissas do modelo. Todas são estimativas (ver docs/modelo.md).
// Mudar um valor aqui afeta os três carros igualmente.

export const PHYS = {
  g: 9.81,
  rho0: 1.2,          // densidade do ar ao nível do mar (kg/m³)
  scaleHeight: 8500,  // altura de escala da atmosfera (m)
  crr: 0.010,         // resistência de rolamento
  frontalFactor: 0.85 // área frontal ≈ fator × largura × altura
};

export const POWERTRAIN = {
  etaBatteryToWheel: 0.85,   // bateria → inversor → motor → rodas
  etaEngineToWheel: 0.82,    // térmico → gerador → motor → rodas (caminho série)
  etaEngineToBattery: 0.89,  // excedente do térmico recarregando a bateria
  engineSustainedFrac: 0.85, // fração da potência nominal que o térmico sustenta
  turboAltitudeBonus: 0.12,  // turbo compensa a perda por altitude até esse tanto
  gasolineKWhPerL: 8.9
};

export const BATTERY = {
  kWPerKWh: 12,        // teto de potência por kWh de capacidade (limita baterias pequenas)
  peakOverMotor: 1.05, // teto também limitado pela potência do motor elétrico
  // A curva de ajuda é relativa ao piso elétrico de cada carro (evFloor em vehicles.js).
  // Calibrada no Song 2024 (piso 25%): ajuda plena acima de 50%, zero em 20%.
  assistFullAboveFloor: 25, // pontos acima do piso em que a bateria ajuda plenamente
  assistZeroBelowFloor: 5,  // pontos abaixo do piso em que a bateria deixa de ajudar
  effortFloor: 0.5,    // esforço contínuo reduz o teto até essa fração
  effortTauS: 120      // memória do esforço (s)
};

export const STRATEGY = {
  defaultEvFloor: 25,   // piso elétrico de fábrica para carro sem evFloor na ficha
  hysteresis: 4,        // térmico recarrega até limiar + 4 pontos e desliga
  chargeBaseKW: 10,     // recarga mínima com o térmico ligado
  chargePerPointKW: 2,  // recarga extra por ponto abaixo do alvo
  chargeMaxKW: 30,
  reserveMaxKW: 10,     // abaixo do limiar, parte do térmico fica reservada para recarga
  reserveFrac: 0.15
};

// [aceleração das retomadas (m/s²), fração de cada bloco de 500 m acelerando]
export const DRIVING_STYLES = {
  c: { label: 'Velocidade constante', accel: 0, frac: 0 },
  n: { label: 'Normal, com retomadas de curva', accel: 0.8, frac: 0.3 },
  f: { label: 'Forte, com ultrapassagens', accel: 1.2, frac: 0.4 }
};

export const STEP_M = 50;      // passo da simulação (m)
export const RETAKE_BLOCK_M = 500;
export const FLAT_GRADE = 0.3; // inclinação do "plano antes" (%)
