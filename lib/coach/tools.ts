import "server-only";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { checkIns, plannedWorkouts, SPORTS, type ChangeLogEntry } from "@/lib/db/schema";
import {
  getActiveGoals,
  getAthlete,
  getPlan,
  getRecentActivities,
  getRecentCheckIns,
  getTrainingLoad,
} from "@/lib/data/queries";
import { addDays } from "@/lib/training/load";
import { daysBetween, localDate } from "@/lib/dates";

const WORKOUT_TYPES = [
  "recovery",
  "endurance",
  "tempo",
  "sweetspot",
  "threshold",
  "vo2max",
  "anaerobic",
  "strength",
  "mobility",
  "rest",
] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date in YYYY-MM-DD format");

const rationaleSchema = z
  .object({
    summary: z.string().describe("1–2 sentences: why exactly this workout on this day?"),
    factors: z
      .array(
        z.object({
          label: z.string().describe("e.g. 'Form (TSB)', 'Sleep last night', 'Goal: Ötztaler'"),
          value: z.string().describe("Concrete data value, e.g. '-18', '2/5', 'in 9 weeks'"),
          effect: z.enum(["increase", "decrease", "neutral"]).describe("Did this factor increase, decrease or not change the load?"),
        }),
      )
      .min(1)
      .describe("The data points the decision is based on"),
    principle: z.string().describe("Underlying training principle, e.g. 'Progressive overload', 'Supercompensation'"),
    goalId: z.number().int().nullable().optional().describe("ID of the goal this workout contributes to"),
    confidence: z.enum(["low", "medium", "high"]).describe("How confident are you in this recommendation given the available data?"),
    alternatives: z.string().optional().describe("What would be a sensible alternative if this doesn't fit?"),
  })
  .describe("Structured rationale – shown to the athlete under 'Why?'");

const stepSchema = z.object({
  label: z.string(),
  durationMin: z.number(),
  target: z.string().describe("Intensity, e.g. '88–94% FTP', 'Z2', 'RPE 6', '3×12 reps'"),
  repeat: z.number().int().optional(),
});

const json = (value: unknown) => JSON.stringify(value);

// Fine-grained tool streaming: betaZodTool validates the input against the schema itself
const streaming = { eager_input_streaming: true } as const;

export function createCoachTools(athleteId: number) {
  const getAthleteContext = betaZodTool({
    name: "get_athlete_context",
    description:
      "Athlete profile (FTP, weight, heart rate values, available weekdays, weekly hours, cross-training sports) and all active goals with days remaining. Call this at the start of any planning.",
    inputSchema: z.object({}),
    run: async () => {
      const athlete = await getAthlete();
      const goals = await getActiveGoals(athleteId);
      const today = localDate();
      return json({
        today,
        athlete,
        goals: goals.map((g) => ({
          ...g,
          daysUntil: g.targetDate ? daysBetween(today, g.targetDate) : null,
        })),
      });
    },
  });

  const getLoad = betaZodTool({
    name: "get_training_load",
    description:
      "Current training load: CTL (fitness), ATL (fatigue), TSB (form) with interpretation, ramp rate (CTL increase per week) and weekly TSS totals.",
    inputSchema: z.object({ weeks: z.number().int().min(1).max(26).default(8) }),
    run: async ({ weeks }) => {
      const load = await getTrainingLoad(athleteId, weeks * 7);
      const weekly: { weekEnding: string; tss: number }[] = [];
      for (let i = load.points.length; i > 0; i -= 7) {
        const slice = load.points.slice(Math.max(0, i - 7), i);
        weekly.unshift({ weekEnding: slice[slice.length - 1].date, tss: Math.round(slice.reduce((s, p) => s + p.tss, 0)) });
      }
      const round = (n: number) => Math.round(n * 10) / 10;
      return json({
        current: {
          ctl: round(load.current.ctl),
          atl: round(load.current.atl),
          tsb: round(load.current.tsb),
        },
        form: load.form,
        rampRatePerWeek: load.rampRate === null ? null : round(load.rampRate),
        last7DaysTss: Math.round(load.last7DaysTss),
        weekly,
      });
    },
  });

  const getActivities = betaZodTool({
    name: "get_activities",
    description:
      "Completed activities (all sports) with duration, power, NP, IF, TSS (incl. calculation method), HR, zone distribution and best efforts.",
    inputSchema: z.object({
      days: z.number().int().min(1).max(120).default(14),
      sport: z.enum(SPORTS).optional(),
    }),
    run: async ({ days, sport }) => {
      const rows = await getRecentActivities(athleteId, days, 100);
      return json(
        rows
          .filter((a) => !sport || a.sport === sport)
          .map((a) => ({ ...a, athleteId: undefined, createdAt: undefined, date: localDate(a.startTime) })),
      );
    },
  });

  const getCheckIns = betaZodTool({
    name: "get_checkins",
    description:
      "Subjective daily check-ins (sleep, energy, soreness, stress on a 1–5 scale, available time, note). Important for reacting to how the athlete feels.",
    inputSchema: z.object({ days: z.number().int().min(1).max(30).default(7) }),
    run: async ({ days }) => json(await getRecentCheckIns(athleteId, days)),
  });

  const getPlanTool = betaZodTool({
    name: "get_plan",
    description: "Planned workouts in the date range, incl. status, rationale and change history.",
    inputSchema: z.object({ from: isoDate.optional(), to: isoDate.optional() }),
    run: async ({ from, to }) => {
      const today = localDate();
      return json(await getPlan(athleteId, from ?? addDays(today, -7), to ?? addDays(today, 14)));
    },
  });

  const scheduleWorkout = betaZodTool({
    name: "schedule_workout",
    description:
      "Adds a workout to the plan – cycling, cross-training (running, strength, mobility, swimming …) or a deliberate rest day. Every workout needs a traceable, data-based rationale.",
    inputSchema: z.object({
      date: isoDate,
      sport: z.enum(SPORTS),
      workoutType: z.enum(WORKOUT_TYPES),
      title: z.string(),
      durationMin: z.number().int().min(0),
      targetTss: z.number().optional(),
      description: z.string().describe("Short instructions for doing the workout"),
      structure: z.array(stepSchema).default([]),
      rationale: rationaleSchema,
    }),
    run: async (input) => {
      const [row] = await db
        .insert(plannedWorkouts)
        .values({ athleteId, ...input })
        .returning({ id: plannedWorkouts.id });
      return json({ ok: true, id: row.id });
    },
  });

  const updateWorkout = betaZodTool({
    name: "update_workout",
    description:
      "Changes, moves, replaces or cancels a planned workout (e.g. due to illness, lack of time, fatigue, weather). The reason is saved in the change history, visible to the athlete.",
    inputSchema: z.object({
      id: z.number().int(),
      reason: z.string().describe("Why is it being changed? Shown to the athlete."),
      changeSummary: z.string().describe("What was changed, e.g. 'Moved from Tue to Thu, 90→60 min'"),
      date: isoDate.optional(),
      sport: z.enum(SPORTS).optional(),
      workoutType: z.enum(WORKOUT_TYPES).optional(),
      title: z.string().optional(),
      durationMin: z.number().int().min(0).optional(),
      targetTss: z.number().optional(),
      description: z.string().optional(),
      structure: z.array(stepSchema).optional(),
      status: z.enum(["planned", "skipped"]).optional(),
      rationale: rationaleSchema.optional(),
    }),
    run: async ({ id, reason, changeSummary, ...changes }) => {
      const existing = await db.query.plannedWorkouts.findFirst({
        where: and(eq(plannedWorkouts.id, id), eq(plannedWorkouts.athleteId, athleteId)),
      });
      if (!existing) return json({ ok: false, error: `Workout ${id} not found` });
      const entry: ChangeLogEntry = { at: new Date().toISOString(), change: changeSummary, reason };
      await db
        .update(plannedWorkouts)
        .set({ ...changes, changeLog: [...existing.changeLog, entry], updatedAt: new Date() })
        .where(eq(plannedWorkouts.id, id));
      return json({ ok: true });
    },
  });

  const logCheckIn = betaZodTool({
    name: "log_checkin",
    description:
      "Saves what the athlete says in the chat about how they feel (e.g. 'slept badly', 'have a cold', 'only 30 min today') so later decisions can build on it.",
    inputSchema: z.object({
      sleep: z.number().int().min(1).max(5).optional(),
      energy: z.number().int().min(1).max(5).optional(),
      soreness: z.number().int().min(1).max(5).optional(),
      stress: z.number().int().min(1).max(5).optional(),
      availableMin: z.number().int().min(0).optional(),
      note: z.string(),
    }),
    run: async (input) => {
      await db.insert(checkIns).values({ athleteId, date: localDate(), ...input });
      return json({ ok: true });
    },
  });

  return [
    getAthleteContext,
    getLoad,
    getActivities,
    getCheckIns,
    getPlanTool,
    scheduleWorkout,
    updateWorkout,
    logCheckIn,
  ].map((tool) => ({ ...tool, ...streaming }));
}

/** Human-readable labels showing which data the coach looked at. */
export const TOOL_LABELS: Record<string, string> = {
  get_athlete_context: "Checked profile & goals",
  get_training_load: "Analyzed training load",
  get_activities: "Reviewed activities",
  get_checkins: "Checked how you feel",
  get_plan: "Looked at the plan",
  schedule_workout: "Scheduled a workout",
  update_workout: "Adjusted a workout",
  log_checkin: "Noted how you feel",
};
