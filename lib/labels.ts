export const SPORT_LABELS: Record<string, string> = {
  cycling: "Cycling",
  indoor_cycling: "Indoor cycling",
  running: "Running",
  strength: "Strength",
  mobility: "Mobility/Yoga",
  swimming: "Swimming",
  hiking: "Hiking",
  other: "Other",
};

export const CROSS_TRAINING_OPTIONS = ["running", "strength", "mobility", "swimming", "hiking"] as const;

export const WORKOUT_TYPE_STYLES: Record<string, { label: string; className: string }> = {
  rest: { label: "Rest day", className: "bg-muted text-muted-foreground" },
  recovery: { label: "Recovery", className: "bg-info/15 text-info" },
  endurance: { label: "Endurance", className: "bg-success/15 text-success" },
  tempo: { label: "Tempo", className: "bg-warning/15 text-warning" },
  sweetspot: { label: "Sweet spot", className: "bg-warning/15 text-warning" },
  threshold: { label: "Threshold", className: "bg-primary/15 text-primary" },
  vo2max: { label: "VO2max", className: "bg-destructive/15 text-destructive" },
  anaerobic: { label: "Anaerobic", className: "bg-destructive/15 text-destructive" },
  strength: { label: "Strength", className: "bg-muted text-foreground" },
  mobility: { label: "Mobility", className: "bg-muted text-foreground" },
};

export const FORM_TONE_CLASS: Record<string, string> = {
  fresh: "text-info",
  optimal: "text-success",
  neutral: "text-foreground",
  tired: "text-warning",
  risk: "text-destructive",
};

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
