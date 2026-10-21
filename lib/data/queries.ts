import "server-only";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, athletes, checkIns, coachMessages, goals, plannedWorkouts } from "@/lib/db/schema";
import { addDays, computeLoad, interpretForm, rampRate } from "@/lib/training/load";
import { localDate } from "@/lib/dates";

/**
 * MVP: single user. There is exactly one athlete, created on first access.
 * Once auth is added, the athleteId will be read from the session here.
 */
export async function getAthlete() {
  const existing = await db.query.athletes.findFirst({ orderBy: asc(athletes.id) });
  if (existing) return existing;
  // Fixed ID + ON CONFLICT: concurrent first requests never create a second athlete
  await db.insert(athletes).values({ id: 1 }).onConflictDoNothing();
  return (await db.query.athletes.findFirst({ orderBy: asc(athletes.id) }))!;
}

export async function getActiveGoals(athleteId: number) {
  return db
    .select()
    .from(goals)
    .where(and(eq(goals.athleteId, athleteId), eq(goals.status, "active")))
    .orderBy(asc(goals.targetDate));
}

export async function getAllGoals(athleteId: number) {
  return db.select().from(goals).where(eq(goals.athleteId, athleteId)).orderBy(desc(goals.createdAt));
}

export async function getRecentActivities(athleteId: number, days = 28, limit = 50) {
  const since = new Date(Date.now() - days * 86_400_000);
  return db
    .select()
    .from(activities)
    .where(and(eq(activities.athleteId, athleteId), gte(activities.startTime, since)))
    .orderBy(desc(activities.startTime))
    .limit(limit);
}

export async function getActivity(athleteId: number, id: number) {
  return db.query.activities.findFirst({
    where: and(eq(activities.athleteId, athleteId), eq(activities.id, id)),
  });
}

export async function getPlan(athleteId: number, from: string, to: string) {
  return db
    .select()
    .from(plannedWorkouts)
    .where(
      and(
        eq(plannedWorkouts.athleteId, athleteId),
        gte(plannedWorkouts.date, from),
        lte(plannedWorkouts.date, to),
      ),
    )
    .orderBy(asc(plannedWorkouts.date), asc(plannedWorkouts.id));
}

export async function getRecentCheckIns(athleteId: number, days = 7) {
  return db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.athleteId, athleteId), gte(checkIns.date, addDays(localDate(), -days))))
    .orderBy(desc(checkIns.date), desc(checkIns.id));
}

/** Training load incl. interpretation – used by both the UI and the coach. */
export async function getTrainingLoad(athleteId: number, days = 90) {
  const today = localDate();
  // 120 days of lead-in so the 42-day CTL has settled
  const from = addDays(today, -(days + 120));
  const rows = await db
    .select({ startTime: activities.startTime, tss: activities.tss })
    .from(activities)
    .where(and(eq(activities.athleteId, athleteId), gte(activities.startTime, new Date(`${from}T00:00:00Z`))));

  const daily = rows.map((r) => ({ date: localDate(r.startTime), tss: r.tss ?? 0 }));
  const all = computeLoad(daily, from, today);
  const points = all.slice(-days);
  const current = points[points.length - 1];
  return {
    points,
    current,
    form: interpretForm(current.tsb),
    rampRate: rampRate(all),
    last7DaysTss: all.slice(-7).reduce((s, p) => s + p.tss, 0),
  };
}

export async function getCoachHistory(athleteId: number) {
  return db
    .select()
    .from(coachMessages)
    .where(eq(coachMessages.athleteId, athleteId))
    .orderBy(asc(coachMessages.id));
}
