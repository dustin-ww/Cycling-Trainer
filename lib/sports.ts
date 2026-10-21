// Separate file without DB dependencies so client components can import it too
export const SPORTS = [
  "cycling",
  "indoor_cycling",
  "running",
  "strength",
  "mobility",
  "swimming",
  "hiking",
  "other",
] as const;
export type Sport = (typeof SPORTS)[number];
