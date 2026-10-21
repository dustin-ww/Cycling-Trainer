"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import {
  activities,
  athletes,
  checkIns,
  coachMessages,
  goals,
  plannedWorkouts,
  SPORTS,
  type Sport,
} from "@/lib/db/schema";
import { getAthlete } from "@/lib/data/queries";
import { parseFitActivity } from "@/lib/fit/parse";
import { bestTss } from "@/lib/training/metrics";
import { localDate } from "@/lib/dates";

export type ActionState = { ok: boolean; message: string } | null;

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const num = (fd: FormData, key: string) => {
  const v = str(fd, key);
  return v === null || Number.isNaN(Number(v)) ? null : Number(v);
};

export async function saveProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const athlete = await getAthlete();
  await db
    .update(athletes)
    .set({
      name: str(fd, "name") ?? athlete.name,
      ftp: num(fd, "ftp"),
      weightKg: num(fd, "weightKg"),
      maxHr: num(fd, "maxHr"),
      restingHr: num(fd, "restingHr"),
      lthr: num(fd, "lthr"),
      weeklyHours: num(fd, "weeklyHours"),
      availableDays: fd.getAll("availableDays").map(Number),
      crossTraining: fd.getAll("crossTraining").map(String),
      notes: str(fd, "notes"),
    })
    .where(eq(athletes.id, athlete.id));
  refresh();
  return { ok: true, message: "Profile saved." };
}

export async function createGoal(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const title = str(fd, "title");
  if (!title) return { ok: false, message: "Please give the goal a name." };
  const athlete = await getAthlete();
  await db.insert(goals).values({
    athleteId: athlete.id,
    title,
    type: str(fd, "type") ?? "general",
    priority: str(fd, "priority") ?? "B",
    targetDate: str(fd, "targetDate"),
    targetValue: str(fd, "targetValue"),
    description: str(fd, "description"),
  });
  refresh();
  return { ok: true, message: "Goal created – ask the coach for a plan to get there." };
}

export async function setGoalStatus(id: number, status: "active" | "achieved" | "dropped") {
  const athlete = await getAthlete();
  await db.update(goals).set({ status }).where(and(eq(goals.id, id), eq(goals.athleteId, athlete.id)));
  refresh();
}

export async function saveCheckIn(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const athlete = await getAthlete();
  await db.insert(checkIns).values({
    athleteId: athlete.id,
    date: localDate(),
    sleep: num(fd, "sleep"),
    energy: num(fd, "energy"),
    soreness: num(fd, "soreness"),
    stress: num(fd, "stress"),
    availableMin: num(fd, "availableMin"),
    note: str(fd, "note"),
  });
  refresh();
  return { ok: true, message: "Thanks! The coach will take this into account from now on." };
}

export async function importFit(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, message: "Please choose at least one .fit file." };
  const athlete = await getAthlete();
  const errors: string[] = [];
  let imported = 0;
  for (const file of files) {
    try {
      const parsed = await parseFitActivity(await file.arrayBuffer(), athlete, file.name);
      await db.insert(activities).values({ athleteId: athlete.id, ...parsed });
      imported++;
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }
  refresh();
  const msg = `Imported ${imported} ${imported === 1 ? "activity" : "activities"}.`;
  return errors.length ? { ok: imported > 0, message: `${msg} Errors: ${errors.join("; ")}` } : { ok: true, message: msg };
}

export async function addManualActivity(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const sport = str(fd, "sport") as Sport | null;
  const durationMin = num(fd, "durationMin");
  if (!sport || !SPORTS.includes(sport) || !durationMin) {
    return { ok: false, message: "Sport and duration are required." };
  }
  const athlete = await getAthlete();
  const durationS = Math.round(durationMin * 60);
  const avgPower = num(fd, "avgPower");
  const avgHr = num(fd, "avgHr");
  const rpe = num(fd, "rpe");
  // Without power data we use average power as an NP approximation
  const tss = bestTss({ durationS, np: avgPower, ftp: athlete.ftp, avgHr, lthr: athlete.lthr, rpe });
  const date = str(fd, "date") ?? localDate();
  await db.insert(activities).values({
    athleteId: athlete.id,
    source: "manual",
    sport,
    name: str(fd, "name") ?? "Manual activity",
    startTime: new Date(`${date}T12:00:00`),
    durationS,
    distanceM: num(fd, "distanceKm") !== null ? num(fd, "distanceKm")! * 1000 : null,
    avgPower,
    avgHr,
    rpe,
    tss: tss?.tss ?? null,
    intensityFactor: tss?.intensityFactor ?? null,
    tssMethod: tss?.method ?? null,
    notes: str(fd, "notes"),
  });
  refresh();
  return { ok: true, message: "Activity saved." };
}

export async function setWorkoutStatus(id: number, status: "planned" | "completed" | "skipped") {
  const athlete = await getAthlete();
  await db
    .update(plannedWorkouts)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(plannedWorkouts.id, id), eq(plannedWorkouts.athleteId, athlete.id)));
  refresh();
}

export async function clearCoachChat() {
  const athlete = await getAthlete();
  await db.delete(coachMessages).where(eq(coachMessages.athleteId, athlete.id));
  refresh();
}
