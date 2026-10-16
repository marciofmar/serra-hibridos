import { PHYS, POWERTRAIN, BATTERY, STRATEGY, REGEN, DRIVING_STYLES, STEP_M, RETAKE_BLOCK_M } from './config.js';

const clamp01 = x => Math.max(0, Math.min(1, x));

/**
 * Simula a subida de um veículo híbrido plug-in passo a passo.
 *
 * Modos registrados em cada passo:
 *  REG  – descida, motor elétrico regenerando
 *  EV   – só bateria
 *  CHG  – térmico ligado, cobrindo a demanda e recarregando
 *  BAT  – térmico no máximo e bateria complementando
 *  WEAK – velocidade mantida, mas a aceleração pedida não é entregue ("sem fôlego")
 *  LIM  – nem a velocidade de cruzeiro se sustenta
 *
 * @param {object} car        ficha de src/model/vehicles.js
 * @param {Array}  segments   [[km, %], ...] de buildProfile
 * @param {object} opts       { startAlt, soc0, threshold, speedKmh, extraKg, style }
 *                             threshold ausente ou null = piso elétrico de fábrica do carro
 * @returns {{ points: object[], fuelL: number, threshold: number }}
 */
export function simulate(car, segments, opts) {
  const { startAlt = 0, soc0 = 50, speedKmh = 80, extraKg = 150, style = 'n' } = opts;
  const evFloor = car.evFloor ?? STRATEGY.defaultEvFloor;
  const threshold = opts.threshold ?? evFloor;
  const assistZeroAt = evFloor - BATTERY.assistZeroBelowFloor;
  const assistFullAt = evFloor + BATTERY.assistFullAboveFloor;
  const drive = DRIVING_STYLES[style];
  const m = car.mass + extraKg;
  const area = PHYS.frontalFactor * car.width * car.height;
  const batPeak = Math.min(car.motorKW * BATTERY.peakOverMotor, car.battery * BATTERY.kWPerKWh);

  let soc = soc0, engineOn = false, fuelL = 0, km = 0, effort = 0, alt = startAlt, pos = 0;
  const points = [];

  for (const [lenKm, grade] of segments) {
    const steps = Math.round((lenKm * 1000) / STEP_M);
    const theta = Math.atan(grade / 100);
    for (let i = 0; i < steps; i++) {
      // Ar mais rarefeito: menos arrasto e menos potência no motor aspirado
      const densityRatio = Math.exp(-alt / PHYS.scaleHeight);
      const rho = PHYS.rho0 * densityRatio;
      const altFactor = car.turbo ? Math.min(1, densityRatio + POWERTRAIN.turboAltitudeBonus) : densityRatio;
      const force = v => m * PHYS.g * PHYS.crr * Math.cos(theta) + m * PHYS.g * Math.sin(theta) + 0.5 * rho * car.cd * area * v * v;

      // Teto da bateria: cai com carga baixa e com esforço contínuo
      const socFactor = clamp01((soc - assistZeroAt) / (assistFullAt - assistZeroAt));
      const effortFactor = 1 - (1 - BATTERY.effortFloor) * effort;
      const batAllow = batPeak * socFactor * effortFactor;

      const engineCap = POWERTRAIN.engineSustainedFrac * car.engineKW * altFactor;
      const reserve = engineOn && soc < threshold - 2 ? Math.min(STRATEGY.reserveMaxKW, engineCap * STRATEGY.reserveFrac) : 0;
      const pAvail = Math.min(
        car.systemKW * 0.93,
        (engineCap - reserve) * POWERTRAIN.etaEngineToWheel + Math.min(car.motorKW, batAllow) * POWERTRAIN.etaBatteryToWheel
      );

      // Velocidade de cruzeiro possível
      let v = speedKmh / 3.6;
      let pCruise = force(v) * v / 1000;
      let limited = false;
      if (pCruise > pAvail) {
        limited = true;
        let lo = 1, hi = v;
        for (let k = 0; k < 40; k++) {
          const mid = (lo + hi) / 2;
          if (force(mid) * mid / 1000 > pAvail) hi = mid; else lo = mid;
        }
        v = lo;
        pCruise = force(v) * v / 1000;
      }

      // Retomadas: parte de cada bloco pede aceleração extra
      const accelerating = drive.accel > 0 && (pos % RETAKE_BLOCK_M) < RETAKE_BLOCK_M * drive.frac;
      const pWanted = pCruise + (accelerating ? m * drive.accel * v / 1000 : 0);
      const pWheel = Math.min(pWanted, pAvail);
      const weak = !limited && pWanted > pAvail + 0.5;

      const dt = STEP_M / v;
      if (soc <= threshold) engineOn = true;
      if (engineOn && soc >= threshold + STRATEGY.hysteresis) engineOn = false;

      let pEngine = 0, pBattery, mode;
      const evPossible = pWheel / POWERTRAIN.etaBatteryToWheel <= Math.min(car.motorKW, batAllow);
      if (pWheel <= 0) {
        // Descida: térmico parado, motor elétrico regenera até o teto; o resto vai para os freios
        const taper = clamp01((100 - soc) / (100 - REGEN.taperFrom));
        const regenCap = Math.min(car.motorKW * REGEN.motorFrac, car.battery * REGEN.kWPerKWh) * taper;
        pBattery = -Math.min(-pWheel * REGEN.eta, regenCap);
        mode = pBattery < -0.5 ? 'REG' : 'EV';
      } else if (!engineOn && evPossible) {
        pBattery = pWheel / POWERTRAIN.etaBatteryToWheel;
        mode = 'EV';
      } else {
        const need = pWheel / POWERTRAIN.etaEngineToWheel;
        const charge = engineOn
          ? Math.max(reserve, Math.min(STRATEGY.chargeMaxKW, STRATEGY.chargeBaseKW + STRATEGY.chargePerPointKW * (threshold + STRATEGY.hysteresis - soc)))
          : 0;
        pEngine = Math.min(need + charge, engineCap);
        if (pEngine >= need) {
          pBattery = -(pEngine - need) * POWERTRAIN.etaEngineToBattery;
          mode = 'CHG';
        } else {
          pBattery = Math.min((need - pEngine) * POWERTRAIN.etaEngineToWheel / POWERTRAIN.etaBatteryToWheel, batAllow);
          mode = 'BAT';
        }
        // Motor em carga baixa queima mais por kWh
        const load = pEngine / car.engineKW;
        const eta = car.engineEff * (0.6 + 0.4 * Math.min(load / 0.5, 1));
        fuelL += pEngine / eta * dt / 3600 / POWERTRAIN.gasolineKWhPerL;
      }
      if (limited) mode = 'LIM'; else if (weak) mode = 'WEAK';

      effort += (Math.max(0, pBattery) / batPeak - effort) * (1 - Math.exp(-dt / BATTERY.effortTauS));
      soc = Math.min(100, soc - pBattery * dt / 3600 / car.battery * 100);
      km += STEP_M / 1000;
      pos += STEP_M;
      alt += STEP_M * grade / 100;

      points.push({ km: +km.toFixed(2), alt, soc, pWanted, pEngine, pBattery, pAvail, speedKmh: v * 3.6, mode, grade, fuelL });
    }
  }
  return { points, fuelL, threshold };
}

export function summarize(result, targetSpeed) {
  const p = result.points;
  const kmOf = mode => p.filter(x => x.mode === mode).length * STEP_M / 1000;
  return {
    finalSoc: p.length ? p[p.length - 1].soc : NaN,
    fuelL: result.fuelL,
    weakKm: kmOf('WEAK'),
    limitedKm: kmOf('LIM'),
    evKm: kmOf('EV'),
    minSpeed: Math.min(...p.map(x => x.speedKmh)),
    speedDropped: Math.min(...p.map(x => x.speedKmh)) < targetSpeed - 0.5
  };
}
