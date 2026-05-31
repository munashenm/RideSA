export const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export type GenderValue = (typeof GENDER_OPTIONS)[number]["value"];

export function isFemaleGender(gender: string | null | undefined): boolean {
  return gender === "female";
}

export function canBookWomenOnlyRide(passengerGender: string | null | undefined): boolean {
  return isFemaleGender(passengerGender);
}

export function genderLabel(gender: string | null | undefined): string | null {
  if (!gender) return null;
  return GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? null;
}
