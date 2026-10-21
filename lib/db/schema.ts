import {
  date,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
// Relative import so drizzle-kit can load the file without path aliases
import type { Sport } from "../sports";

export { SPORTS, type Sport } from "../sports";

export const athletes = pgTable("athletes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Athlet"),
  ftp: integer("ftp"),
  weightKg: real("weight_kg"),
  maxHr: integer("max_hr"),
  restingHr: integer("resting_hr"),
  lthr: integer("lthr"),
  weeklyHours: real("weekly_hours"),
  /** ISO weekdays 1 (Mon) – 7 (Sun) on which the athlete can train */
  availableDays: integer("available_days").array().notNull().default([1, 2, 3, 4, 5, 6, 7]),
  /** Sports that are an option for cross-training */
  crossTraining: text("cross_training").array().notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  title: text("title").notNull(),
  /** event | ftp | weight | volume | general */
  type: text("type").notNull().default("general"),
  /** A = season highlight, B = important, C = training stimulus */
  priority: text("priority").notNull().default("B"),
  targetDate: date("target_date"),
  targetValue: text("target_value"),
  description: text("description"),
  /** active | achieved | dropped */
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PowerCurve = Record<string, number>;
export type ZoneDistribution = Record<string, number>;

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  /** fit | manual */
  source: text("source").notNull(),
  sport: text("sport").$type<Sport>().notNull(),
  name: text("name").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  durationS: integer("duration_s").notNull(),
  distanceM: real("distance_m"),
  elevationM: real("elevation_m"),
  avgPower: real("avg_power"),
  normalizedPower: real("normalized_power"),
  avgHr: real("avg_hr"),
  maxHr: real("max_hr"),
  tss: real("tss"),
  intensityFactor: real("intensity_factor"),
  /** power | hr | rpe – where the TSS comes from (important for explainability) */
  tssMethod: text("tss_method"),
  rpe: integer("rpe"),
  /** Best average power per duration in seconds, e.g. { "300": 290 } */
  powerCurve: jsonb("power_curve").$type<PowerCurve>(),
  /** Seconds per Coggan zone, e.g. { "Z2": 3600 } */
  zoneDistribution: jsonb("zone_distribution").$type<ZoneDistribution>(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkoutStep = {
  label: string;
  durationMin: number;
  /** e.g. "88–94% FTP", "Z2", "RPE 6" */
  target: string;
  repeat?: number;
};

export type RationaleFactor = {
  label: string;
  value: string;
  /** How the factor influenced the decision */
  effect: "increase" | "decrease" | "neutral";
};

/** Structured rationale – the core of explainability */
export type Rationale = {
  summary: string;
  factors: RationaleFactor[];
  principle: string;
  goalId?: number | null;
  confidence: "low" | "medium" | "high";
  alternatives?: string;
};

export type ChangeLogEntry = { at: string; change: string; reason: string };

export const plannedWorkouts = pgTable("planned_workouts", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  date: date("date").notNull(),
  sport: text("sport").$type<Sport>().notNull(),
  /** recovery | endurance | tempo | sweetspot | threshold | vo2max | anaerobic | strength | mobility | rest */
  workoutType: text("workout_type").notNull(),
  title: text("title").notNull(),
  durationMin: integer("duration_min").notNull(),
  targetTss: real("target_tss"),
  description: text("description"),
  structure: jsonb("structure").$type<WorkoutStep[]>().notNull().default([]),
  rationale: jsonb("rationale").$type<Rationale>().notNull(),
  /** planned | completed | skipped */
  status: text("status").notNull().default("planned"),
  completedActivityId: integer("completed_activity_id").references(() => activities.id),
  changeLog: jsonb("change_log").$type<ChangeLogEntry[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const checkIns = pgTable("check_ins", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  date: date("date").notNull(),
  /** Scales 1 (poor) – 5 (very good) */
  sleep: integer("sleep"),
  energy: integer("energy"),
  /** 1 (none) – 5 (severe) */
  soreness: integer("soreness"),
  stress: integer("stress"),
  availableMin: integer("available_min"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Conversation history with the coach. `content` stores the Claude API content
 * blocks unchanged (incl. tool_use / tool_result / thinking) so the history can
 * be passed along append-only on the next request.
 */
export const coachMessages = pgTable("coach_messages", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  role: text("role").$type<"user" | "assistant" | "system">().notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Athlete = typeof athletes.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type PlannedWorkout = typeof plannedWorkouts.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
