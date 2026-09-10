/** Calendar identity is local; never round-trip through UTC. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** ISO weekday in the user's local calendar: Monday = 1, Sunday = 7. */
export function localWeekday(date: Date): number {
  return date.getDay() || 7;
}
export function dateHeading(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
export function greeting(date: Date, language: "en" | "tr" = "en"): string {
  const hour = date.getHours();
  if (language === "tr")
    return hour < 12 ? "Günaydın." : hour < 18 ? "Tünaydın." : "İyi akşamlar.";
  return hour < 12
    ? "Good morning."
    : hour < 18
      ? "Good afternoon."
      : "Good evening.";
}

export function assertLocalDateKey(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Expected a local YYYY-MM-DD date.");
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > lengths[month - 1]
  )
    throw new Error("Invalid local calendar date.");
}

/** Exact event time; completion calendar identity remains separate. */
export function currentTimestamp(): string {
  return new Date().toISOString();
}
