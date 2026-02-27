import { G_MIN, G_MAX } from "./quantumConstant";

export interface WaveDataPoint {
  x: number;
  psiReal: number;
  potential: number;
}

const PACKET_SIGMA = 30; // width of Gaussian wave packet

export function generateWaveData(
  displayK: number,
  animPhase: number,
  ballChartX: number,
  barrierStrength: number,
  incomingAmplitude: number,
  transmittedAmplitude: number,
  reflectedAmplitude: number,
  direction: 1 | -1 = 1,
  numPoints: number = 150,
): WaveDataPoint[] {
  const xRange = 100;
  const points: WaveDataPoint[] = [];

  // Normalize barrier strength (g) to visible spike height
  const normalizedG = (barrierStrength - G_MIN) / (G_MAX - G_MIN);
  const spikeHeight = 0.5 + normalizedG * 2.0;

  // Incoming packet center and transmitted center depend on direction
  let incomingCenter: number;
  let transmittedCenter: number;
  if (direction === 1) {
    // From left: incoming on negative side, transmitted on positive
    incomingCenter = Math.max(-90, Math.min(-5, ballChartX));
    transmittedCenter = Math.max(5, Math.min(90, -ballChartX));
  } else {
    // From right: incoming on positive side, transmitted on negative
    incomingCenter = Math.min(90, Math.max(5, ballChartX));
    transmittedCenter = Math.min(-5, Math.max(-90, -ballChartX));
  }
  const reflectedCenter = incomingCenter;

  const sigma2 = 2 * PACKET_SIGMA * PACKET_SIGMA;

  // Phase signs for wave direction:
  // direction = 1:  incoming cos(kx - ωt) right, reflected cos(kx + ωt) left
  // direction = -1: incoming cos(kx + ωt) left,  reflected cos(kx - ωt) right
  const incomingPhaseSign = -direction; // -1 for right-travel, +1 for left-travel
  const reflectedPhaseSign = direction; // opposite of incoming
  const transmittedPhaseSign = incomingPhaseSign; // same direction as incoming

  for (let i = 0; i <= numPoints; i++) {
    const x = -xRange + (2 * xRange * i) / numPoints;

    // Delta function spike at x = 0: nonzero only at the single closest point
    const step = (2 * xRange) / numPoints;
    const potential = Math.abs(x) < step / 2 ? spikeHeight : 0;

    let psiReal = 0;

    // Incident side: x < 0 when direction=1, x > 0 when direction=-1
    const isIncidentSide = direction === 1 ? x < 0 : x > 0;

    if (isIncidentSide) {
      // Incoming wave packet
      const incomingEnv = Math.exp(
        -((x - incomingCenter) * (x - incomingCenter)) / sigma2,
      );
      const incoming =
        incomingEnv *
        Math.cos(displayK * x + incomingPhaseSign * animPhase) *
        incomingAmplitude;

      // Reflected wave packet: same center, opposite travel direction
      const reflectedEnv = Math.exp(
        -((x - reflectedCenter) * (x - reflectedCenter)) / sigma2,
      );
      const reflected =
        reflectedEnv *
        Math.cos(displayK * x + reflectedPhaseSign * animPhase) *
        reflectedAmplitude;

      psiReal = incoming + reflected;
    } else {
      // Transmitted wave packet: passes through barrier
      const transmittedEnv = Math.exp(
        -((x - transmittedCenter) * (x - transmittedCenter)) / sigma2,
      );
      psiReal =
        transmittedEnv *
        Math.cos(displayK * x + transmittedPhaseSign * animPhase) *
        transmittedAmplitude;
    }

    points.push({ x, psiReal, potential });
  }

  return points;
}
