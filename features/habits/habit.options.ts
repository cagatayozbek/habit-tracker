export const icons = [
  "book-outline",
  "walk-outline",
  "leaf-outline",
  "water-outline",
  "fitness-outline",
  "moon-outline",
  "pencil-outline",
  "musical-notes-outline",
] as const;
export const colorOptions = [
  { name: "Amber", value: "#C78A47" },
  { name: "Blue", value: "#748AAF" },
  { name: "Lavender", value: "#9580AE" },
  { name: "Green", value: "#64917B" },
  { name: "Rose", value: "#B66C7C" },
  { name: "Teal", value: "#398C91" },
];
export const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const turkishWeekdays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
export function scheduleLabel(frequency: string, days: number[], language: "en" | "tr" = "en") {
  return frequency === "daily"
    ? language === "tr" ? "Her gün" : "Every day"
    : days.map((day) => (language === "tr" ? turkishWeekdays : weekdays)[day - 1]).join(", ");
}
export function weekdayLabels(language: "en" | "tr") {
  return language === "tr" ? turkishWeekdays : weekdays;
}
