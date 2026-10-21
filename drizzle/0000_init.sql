CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"source" text NOT NULL,
	"sport" text NOT NULL,
	"name" text NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"duration_s" integer NOT NULL,
	"distance_m" real,
	"elevation_m" real,
	"avg_power" real,
	"normalized_power" real,
	"avg_hr" real,
	"max_hr" real,
	"tss" real,
	"intensity_factor" real,
	"tss_method" text,
	"rpe" integer,
	"power_curve" jsonb,
	"zone_distribution" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athletes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Athlet' NOT NULL,
	"ftp" integer,
	"weight_kg" real,
	"max_hr" integer,
	"resting_hr" integer,
	"lthr" integer,
	"weekly_hours" real,
	"available_days" integer[] DEFAULT '{1,2,3,4,5,6,7}' NOT NULL,
	"cross_training" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"date" date NOT NULL,
	"sleep" integer,
	"energy" integer,
	"soreness" integer,
	"stress" integer,
	"available_min" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'general' NOT NULL,
	"priority" text DEFAULT 'B' NOT NULL,
	"target_date" date,
	"target_value" text,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planned_workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"date" date NOT NULL,
	"sport" text NOT NULL,
	"workout_type" text NOT NULL,
	"title" text NOT NULL,
	"duration_min" integer NOT NULL,
	"target_tss" real,
	"description" text,
	"structure" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rationale" jsonb NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"completed_activity_id" integer,
	"change_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_completed_activity_id_activities_id_fk" FOREIGN KEY ("completed_activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;