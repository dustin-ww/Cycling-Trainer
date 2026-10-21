import FitParser from "fit-file-parser";
import type { Athlete, NewActivity, Sport } from "@/lib/db/schema";
import {
  bestTss,
  normalizedPower,
  powerCurve,
  resampleTo1Hz,
  zoneDistribution,
} from "@/lib/training/metrics";

function mapSport(sport?: string, subSport?: string): Sport {
  if (sport === "cycling" || sport === "e_biking") {
    return subSport === "indoor_cycling" || subSport === "virtual_activity" ? "indoor_cycling" : "cycling";
  }
  if (sport === "running") return "running";
  if (sport === "swimming") return "swimming";
  if (sport === "hiking" || sport === "walking") return "hiking";
  if (sport === "training" && subSport === "strength_training") return "strength";
  if (sport === "training" && (subSport === "yoga" || subSport === "flexibility_training")) return "mobility";
  return "other";
}

/** Reads a FIT file and computes all metrics using the athlete's values. */
export async function parseFitActivity(
  buffer: ArrayBuffer,
  athlete: Athlete,
  fileName: string,
): Promise<Omit<NewActivity, "athleteId">> {
  const parser = new FitParser({ force: true, speedUnit: "km/h", lengthUnit: "m", mode: "list" });
  const fit = await parser.parseAsync(buffer);

  const session = fit.sessions?.[0];
  const records = fit.records ?? [];
  if (!session && records.length === 0) {
    throw new Error("The file contains no activity data.");
  }

  const powerSamples = records
    .filter((r) => r.timestamp && typeof r.power === "number")
    .map((r) => ({ t: new Date(r.timestamp as Date).getTime() / 1000, power: r.power as number }));
  const power1Hz = resampleTo1Hz(powerSamples);
  const hasPower = power1Hz.some((p) => p > 0);

  const startTime = new Date(
    (session?.start_time as Date | undefined) ?? (records[0]?.timestamp as Date | undefined) ?? Date.now(),
  );
  const durationS = Math.round(session?.total_timer_time ?? session?.total_elapsed_time ?? power1Hz.length);
  const np = hasPower ? (normalizedPower(power1Hz) ?? session?.normalized_power ?? null) : null;
  const avgHr = session?.avg_heart_rate ?? null;
  const tss = bestTss({ durationS, np, ftp: athlete.ftp, avgHr, lthr: athlete.lthr });
  const sport = mapSport(session?.sport as string | undefined, session?.sub_sport as string | undefined);

  return {
    source: "fit",
    sport,
    name: fileName.replace(/\.fit$/i, ""),
    startTime,
    durationS,
    distanceM: session?.total_distance ?? null,
    elevationM: session?.total_ascent ?? null,
    avgPower: hasPower ? (session?.avg_power ?? power1Hz.reduce((a, b) => a + b, 0) / power1Hz.length) : null,
    normalizedPower: np,
    avgHr,
    maxHr: session?.max_heart_rate ?? null,
    tss: tss?.tss ?? null,
    intensityFactor: tss?.intensityFactor ?? null,
    tssMethod: tss?.method ?? null,
    powerCurve: hasPower ? powerCurve(power1Hz) : null,
    zoneDistribution: hasPower && athlete.ftp ? zoneDistribution(power1Hz, athlete.ftp) : null,
  };
}
