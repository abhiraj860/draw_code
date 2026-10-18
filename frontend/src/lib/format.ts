/** Color slot per category, used by .badge.c0 … .badge.c9 in the stylesheet. */
const CATEGORY_SLOTS: Record<string, number> = {
  DSA: 0,
  LLD: 1,
  HLD: 2,
  "AI Coding": 3,
  "Machine Learning": 4,
  SQL: 5,
  "CS Fundamentals": 6,
  Frontend: 7,
  Behavioral: 8,
  Other: 9,
};

export const categoryClass = (category: string) => `c${CATEGORY_SLOTS[category] ?? 9}`;

export function monthLabel(yyyyMm: string): string {
  if (!yyyyMm) return "";
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function timeAgo(sqliteUtc: string): string {
  const then = new Date(sqliteUtc.replace(" ", "T") + "Z").getTime();
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, "year"],
    [60 * 60 * 24 * 30, "month"],
    [60 * 60 * 24, "day"],
    [60 * 60, "hour"],
    [60, "minute"],
  ];
  for (const [size, name] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${name}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

export function deadlineLabel(deadline: string): { text: string; urgent: boolean; closed: boolean } | null {
  if (!deadline) return null;
  const end = new Date(deadline + "T23:59:59");
  const days = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "Closed", urgent: false, closed: true };
  if (days === 0) return { text: "Closes today", urgent: true, closed: false };
  return { text: `Closes in ${days} day${days > 1 ? "s" : ""}`, urgent: days <= 7, closed: false };
}
