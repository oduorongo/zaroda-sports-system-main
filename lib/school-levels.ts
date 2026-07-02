// Shared display labels for the SchoolLevel enum (prisma/schema.prisma).

// Championship.schoolLevel: the subscription/pricing tier. Primary and Junior
// Secondary are bundled as one tier here.
export const SCHOOL_LEVELS = [
  { value: "PRIMARY_JS", label: "Primary/JS" },
  { value: "SENIOR_SCHOOL", label: "Senior School" },
  { value: "TERTIARY", label: "Tertiary" },
] as const;

// Game.schoolLevel: more granular. Within a PRIMARY_JS championship each event
// is individually Primary or JS; used by the Add Game form (only the Primary/
// JS choice is ever shown - Senior School/Tertiary championships auto-set
// their one matching value and hide the field) and by rankings/report filters.
export const GAME_SCHOOL_LEVELS = [
  { value: "PRIMARY", label: "Primary" },
  { value: "JS", label: "JS" },
  { value: "SENIOR_SCHOOL", label: "Senior School" },
  { value: "TERTIARY", label: "Tertiary" },
] as const;

export type SchoolLevelValue = (typeof SCHOOL_LEVELS)[number]["value"];
export type GameSchoolLevelValue = (typeof GAME_SCHOOL_LEVELS)[number]["value"];

export function schoolLevelLabel(value: string): string {
  return SCHOOL_LEVELS.find((l) => l.value === value)?.label ?? value;
}

export function gameSchoolLevelLabel(value: string): string {
  return GAME_SCHOOL_LEVELS.find((l) => l.value === value)?.label ?? value;
}
