/**
 * Training metrics after Coggan/Allen. Pure functions without DB access so
 * they are testable and the coach can cite them transparently.
 */

export const POWER_ZONES = [
  { zone: "Z1", name: "Active recovery", min: 0, max: 0.55 },
  { zone: "Z2", name: "Endurance", min: 0.55, max: 0.75 },
  { zone: "Z3", name: "Tempo", min: 0.75, max: 0.9 },
  { zone: "Z4", name: "Threshold", min: 0.9, max: 1.05 },
  { zone: "Z5", name: "VO2max", min: 1.05, max: 1.2 },
  { zone: "Z6", name: "Anaerobic", min: 1.2, max: 1.5 },
  { zone: "Z7", name: "Neuromuscular", min: 1.5, max: Infinity },
] as const;

export const CURVE_DURATIONS_S = [5, 15, 60, 300, 1200, 3600] as const;

/** Fills gaps onto a 1-second grid (recording pauses = 0 W). */
export function resampleTo1Hz(samples: { t: number; power: number }[]): number[] {
  if (samples.length === 0) return [];
  const start = samples[0].t;
  const end = samples[samples.length - 1].t;
  const out = new Array<number>(Math.max(1, Math.round(end - start) + 1)).fill(0);
  for (const s of samples) {
    const i = Math.round(s.t - start);
    if (i >= 0 && i < out.length) out[i] = s.power;
  }
  return out;
}

/** Normalized Power: 4th root of the mean of the 30 s rolling averages to the 4th power. */
export function normalizedPower(power1Hz: number[]): number | null {
  if (power1Hz.length < 30) return null;
  let windowSum = 0;
  let sumFourth = 0;
  let count = 0;
  for (let i = 0; i < power1Hz.length; i++) {
    windowSum += power1Hz[i];
    if (i >= 30) windowSum -= power1Hz[i - 30];
    if (i >= 29) {
      sumFourth += (windowSum / 30) ** 4;
      count++;
    }
  }
  return Math.pow(sumFourth / count, 0.25);
}

export function intensityFactor(np: number, ftp: number): number {
  return np / ftp;
}

/** TSS = (s × NP × IF) / (FTP × 3600) × 100 */
export function powerTss(durationS: number, np: number, ftp: number): number {
  const ifactor = intensityFactor(np, ftp);
  return ((durationS * np * ifactor) / (ftp * 3600)) * 100;
}

/** hrTSS based on intensity relative to lactate threshold heart rate. */
export function hrTss(durationS: number, avgHr: number, lthr: number): number {
  const ifactor = avgHr / lthr;
  return (durationS / 3600) * ifactor * ifactor * 100;
}

/**
 * Rough estimate from perceived exertion (RPE 1–10), e.g. for strength training
 * or activities without sensors. Deliberately marked as "rpe".
 */
export function rpeTss(durationS: number, rpe: number): number {
  const ifactor = Math.min(1.1, Math.max(0.4, rpe / 10 + 0.05));
  return (durationS / 3600) * ifactor * ifactor * 100;
}

export function powerCurve(power1Hz: number[]): Record<string, number> {
  const curve: Record<string, number> = {};
  for (const d of CURVE_DURATIONS_S) {
    if (power1Hz.length < d) continue;
    let sum = 0;
    let best = 0;
    for (let i = 0; i < power1Hz.length; i++) {
      sum += power1Hz[i];
      if (i >= d) sum -= power1Hz[i - d];
      if (i >= d - 1) best = Math.max(best, sum / d);
    }
    curve[String(d)] = Math.round(best);
  }
  return curve;
}

export function zoneDistribution(power1Hz: number[], ftp: number): Record<string, number> {
  const dist: Record<string, number> = Object.fromEntries(POWER_ZONES.map((z) => [z.zone, 0]));
  for (const p of power1Hz) {
    const rel = p / ftp;
    const zone = POWER_ZONES.find((z) => rel >= z.min && rel < z.max) ?? POWER_ZONES[0];
    dist[zone.zone] += 1;
  }
  return dist;
}

export type TssResult = { tss: number; method: "power" | "hr" | "rpe"; intensityFactor: number | null };

/** Picks the most accurate method available: power > heart rate > RPE. */
export function bestTss(input: {
  durationS: number;
  np?: number | null;
  ftp?: number | null;
  avgHr?: number | null;
  lthr?: number | null;
  rpe?: number | null;
}): TssResult | null {
  const { durationS, np, ftp, avgHr, lthr, rpe } = input;
  if (np && ftp) {
    return { tss: powerTss(durationS, np, ftp), method: "power", intensityFactor: np / ftp };
  }
  if (avgHr && lthr) {
    return { tss: hrTss(durationS, avgHr, lthr), method: "hr", intensityFactor: avgHr / lthr };
  }
  if (rpe) {
    return { tss: rpeTss(durationS, rpe), method: "rpe", intensityFactor: null };
  }
  return null;
}
