// Shared display labels for the SchoolLevel enum (prisma/schema.prisma),
// used by every form/filter that lists school levels.

export const SCHOOL_LEVELS = [
  { value: "PRIMARY_JS", label: "Primary/JS" },
  { value: "SENIOR_SCHOOL", label: "Senior School" },
  { value: "TERTIARY", label: "Tertiary" },
] as const;

export type SchoolLevelValue = (typeof SCHOOL_LEVELS)[number]["value"];

export function schoolLevelLabel(value: string): string {
  return SCHOOL_LEVELS.find((l) => l.value === value)?.label ?? value;
}
