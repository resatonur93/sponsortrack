export type GreetingKey = "morning" | "afternoon" | "evening";

/** hour is 0–23, local time. <12 morning, 12–17 afternoon, >=18 evening. */
export function getGreetingKey(hour: number): GreetingKey {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
