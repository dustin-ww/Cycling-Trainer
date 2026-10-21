/**
 * Performance Management Chart: CTL (fitness, 42 days), ATL (fatigue, 7 days)
 * and TSB (form = previous day's CTL − ATL) as exponentially weighted averages.
 */

export type DailyLoad = { date: string; tss: number };
export type LoadPoint = { date: string; tss: number; ctl: number; atl: number; tsb: number };

const CTL_DAYS = 42;
const ATL_DAYS = 7;

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeLoad(daily: DailyLoad[], from: string, to: string): LoadPoint[] {
  const byDate = new Map<string, number>();
  for (const d of daily) byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.tss);

  const points: LoadPoint[] = [];
  let ctl = 0;
  let atl = 0;
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const tss = byDate.get(date) ?? 0;
    const tsb = ctl - atl;
    ctl += (tss - ctl) / CTL_DAYS;
    atl += (tss - atl) / ATL_DAYS;
    points.push({ date, tss, ctl, atl, tsb });
  }
  return points;
}

export type FormState = {
  label: string;
  description: string;
  tone: "fresh" | "optimal" | "neutral" | "tired" | "risk";
};

/** Interprets TSB – the coach also uses these texts in its rationale. */
export function interpretForm(tsb: number): FormState {
  if (tsb > 15) {
    return { label: "Very fresh", description: "Little fatigue, but fitness may decline if this lasts.", tone: "fresh" };
  }
  if (tsb > 5) {
    return { label: "Fresh", description: "Good conditions for racing or hard sessions.", tone: "optimal" };
  }
  if (tsb >= -10) {
    return { label: "Neutral", description: "Balanced – normal training is fine.", tone: "neutral" };
  }
  if (tsb >= -30) {
    return { label: "Productive load", description: "Fatigued, but in the range where fitness is built.", tone: "tired" };
  }
  return { label: "Overreaching risk", description: "Very high fatigue – prioritize recovery.", tone: "risk" };
}

/** CTL increase per week; > ~7 is considered aggressive for most athletes. */
export function rampRate(points: LoadPoint[]): number | null {
  if (points.length < 8) return null;
  const last = points[points.length - 1];
  const weekAgo = points[points.length - 8];
  return last.ctl - weekAgo.ctl;
}
