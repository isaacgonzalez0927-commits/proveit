import { endOfWeek, format, isWithinInterval, startOfWeek } from "date-fns";
import type { Goal, ProofSubmission } from "@/types";
import { safeParseISO } from "@/lib/dateUtils";

export interface WeeklyCollagePhoto {
  submissionId: string;
  date: string;
  imageDataUrl: string;
  goalId: string;
  goalTitle: string;
}

export interface WeeklyCollage {
  weekStart: string;
  weekEnd: string;
  label: string;
  photos: WeeklyCollagePhoto[];
  proofCount: number;
}

function weekKey(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 0 }), "yyyy-MM-dd");
}

/** Group verified proof photos into calendar weeks (Sunday start). */
export function buildWeeklyCollages(
  submissions: ProofSubmission[],
  goals: Goal[],
  options?: { maxWeeks?: number; referenceDate?: Date }
): WeeklyCollage[] {
  const maxWeeks = options?.maxWeeks ?? 12;
  const referenceDate = options?.referenceDate ?? new Date();
  const goalById = new Map(goals.map((g) => [g.id, g]));

  const verifiedWithPhotos = submissions.filter(
    (s) =>
      s.status === "verified" &&
      typeof s.imageDataUrl === "string" &&
      s.imageDataUrl.length > 10
  );

  const byWeek = new Map<string, WeeklyCollagePhoto[]>();
  for (const sub of verifiedWithPhotos) {
    const parsed = safeParseISO(sub.date);
    if (!parsed) continue;
    const key = weekKey(parsed);
    const goal = goalById.get(sub.goalId);
    const list = byWeek.get(key) ?? [];
    list.push({
      submissionId: sub.id,
      date: sub.date,
      imageDataUrl: sub.imageDataUrl,
      goalId: sub.goalId,
      goalTitle: goal?.title ?? "Goal",
    });
    byWeek.set(key, list);
  }

  const weeks: WeeklyCollage[] = [];
  for (const [weekStartKey, photos] of byWeek.entries()) {
    const start = safeParseISO(weekStartKey);
    if (!start) continue;
    const end = endOfWeek(start, { weekStartsOn: 0 });
    photos.sort((a, b) => a.date.localeCompare(b.date));
    weeks.push({
      weekStart: weekStartKey,
      weekEnd: format(end, "yyyy-MM-dd"),
      label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
      photos,
      proofCount: photos.length,
    });
  }

  weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  const currentWeekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
  const cutoff = new Date(currentWeekStart);
  cutoff.setDate(cutoff.getDate() - maxWeeks * 7);

  return weeks
    .filter((week) => {
      const start = safeParseISO(week.weekStart);
      if (!start) return false;
      return isWithinInterval(start, { start: cutoff, end: referenceDate });
    })
    .slice(0, maxWeeks);
}
