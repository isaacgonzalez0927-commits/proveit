import { addDays, format, parseISO } from "date-fns";
import type { Goal, GraceDayEvent, ProofSubmission } from "@/types";
import { countVerifiedInCalendarWeek } from "@/lib/goalDue";
import { getEffectiveQuotaForWeek, isNeutralSignupWeekMiss } from "@/lib/goalSchedule";
import {
  hasGraceDayForGoalWeek,
  weekStartKey,
  type GraceDayLike,
} from "@/lib/graceDays";

const STORAGE_KEY = "proveit_garden_meta_v1";
const NOTES_KEY = "proveit_gardeners_notes_v1";
const NOTE_TTL_MS = 24 * 60 * 60 * 1000;
const BLOOM_PERFECT_WEEKS = 4;

type SubmissionLike = Pick<ProofSubmission, "date" | "status">;

type GoalGardenMeta = {
  syncedWeekStart: string;
  perfectWeekStreak: number;
  /** Week through which bloom visuals are shown (inclusive). */
  bloomThroughWeekStart: string | null;
  recoverySeasonKey: string;
  recoveryUsedInSeason: boolean;
  recoveryActiveWeekStart: string | null;
  /** One-time: prorated signup week quota was completed. */
  welcomeWeekCompleted?: boolean;
};

type GardenersNoteRecord = {
  text: string;
  expiresAt: string;
};

export type GardenWeekContext = {
  recoveryActive: boolean;
  inBloomSeason: boolean;
  perfectWeekStreak: number;
};

function seasonKey(date: Date = new Date()): string {
  return format(date, "yyyy-MM");
}

function previousWeekStart(weekStart: string): string {
  return weekStartKey(addDays(parseISO(weekStart), -1));
}

function defaultMeta(weekStart: string): GoalGardenMeta {
  return {
    syncedWeekStart: weekStart,
    perfectWeekStreak: 0,
    bloomThroughWeekStart: null,
    recoverySeasonKey: seasonKey(),
    recoveryUsedInSeason: false,
    recoveryActiveWeekStart: null,
  };
}

function readAllMeta(): Record<string, GoalGardenMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GoalGardenMeta>;
  } catch {
    return {};
  }
}

function writeAllMeta(all: Record<string, GoalGardenMeta>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function verifiedInWeek(
  submissions: SubmissionLike[],
  weekStart: string
): number {
  const ref = parseISO(weekStart);
  return countVerifiedInCalendarWeek(submissions, ref);
}

function weekWasPerfect(
  goal: Pick<Goal, "id" | "frequency" | "timesPerWeek" | "createdAt">,
  submissions: SubmissionLike[],
  graceDays: GraceDayLike[],
  weekStart: string
): boolean {
  if (hasGraceDayForGoalWeek(graceDays, goal.id, weekStart)) return true;
  const needed = getEffectiveQuotaForWeek(goal as Goal, parseISO(weekStart));
  return verifiedInWeek(submissions, weekStart) >= needed;
}

function weekEndedDead(
  goal: Pick<Goal, "frequency" | "timesPerWeek" | "createdAt">,
  submissions: SubmissionLike[],
  graceDays: GraceDayLike[],
  goalId: string,
  weekStart: string
): boolean {
  if (hasGraceDayForGoalWeek(graceDays, goalId, weekStart)) return false;
  const ref = parseISO(weekStart);
  const verified = verifiedInWeek(submissions, weekStart);
  if (isNeutralSignupWeekMiss(goal as Goal, ref, verified)) return false;
  const needed = getEffectiveQuotaForWeek(goal as Goal, ref);
  return verified < needed;
}

/** Sync week rollover: bloom streak, recovery eligibility, bloom display. */
export function syncGardenWeekMeta(
  goalId: string,
  goal: Pick<Goal, "id" | "frequency" | "timesPerWeek" | "archivedAt" | "createdAt">,
  submissions: SubmissionLike[],
  graceDays: GraceDayLike[] = [],
  now: Date = new Date()
): GardenWeekContext {
  const currentWeek = weekStartKey(now);
  const all = readAllMeta();
  let meta = all[goalId] ?? defaultMeta(currentWeek);
  const currentSeason = seasonKey(now);

  if (meta.recoverySeasonKey !== currentSeason) {
    meta = {
      ...meta,
      recoverySeasonKey: currentSeason,
      recoveryUsedInSeason: false,
      recoveryActiveWeekStart: null,
    };
  }

  if (meta.syncedWeekStart !== currentWeek) {
    const prevWeek = previousWeekStart(currentWeek);

    if (meta.bloomThroughWeekStart && meta.bloomThroughWeekStart !== currentWeek) {
      meta.bloomThroughWeekStart = null;
    }

    if (!goal.archivedAt) {
      if (weekEndedDead(goal, submissions, graceDays, goalId, prevWeek)) {
        if (!meta.recoveryUsedInSeason) {
          meta.recoveryActiveWeekStart = currentWeek;
        }
      }

      if (weekWasPerfect(goal, submissions, graceDays, prevWeek)) {
        meta.perfectWeekStreak += 1;
        if (meta.perfectWeekStreak >= BLOOM_PERFECT_WEEKS) {
          meta.bloomThroughWeekStart = currentWeek;
          meta.perfectWeekStreak = 0;
        }
      } else if (
        !hasGraceDayForGoalWeek(graceDays, goalId, prevWeek) &&
        !isNeutralSignupWeekMiss(
          goal,
          parseISO(prevWeek),
          verifiedInWeek(submissions, prevWeek)
        )
      ) {
        meta.perfectWeekStreak = 0;
      }
    }

    meta.syncedWeekStart = currentWeek;
    all[goalId] = meta;
    writeAllMeta(all);
  }

  const recoveryActive =
    meta.recoveryActiveWeekStart === currentWeek && !meta.recoveryUsedInSeason;
  const inBloomSeason = meta.bloomThroughWeekStart === currentWeek;

  return {
    recoveryActive,
    inBloomSeason,
    perfectWeekStreak: meta.perfectWeekStreak,
  };
}

export function hasWelcomeWeekCompleted(goalId: string): boolean {
  return Boolean(readAllMeta()[goalId]?.welcomeWeekCompleted);
}

/** Mark welcome week complete when prorated signup quota is first met. Returns true if newly completed. */
export function markWelcomeWeekCompleted(goalId: string): boolean {
  if (typeof window === "undefined") return false;
  const all = readAllMeta();
  const meta = all[goalId] ?? defaultMeta(weekStartKey());
  if (meta.welcomeWeekCompleted) return false;
  all[goalId] = { ...meta, welcomeWeekCompleted: true };
  writeAllMeta(all);
  return true;
}

/** Call after first verified proof during a recovery week. */
export function completeGardenRecovery(goalId: string): void {
  if (typeof window === "undefined") return;
  const all = readAllMeta();
  const meta = all[goalId];
  if (!meta?.recoveryActiveWeekStart) return;
  all[goalId] = {
    ...meta,
    recoveryUsedInSeason: true,
    recoveryActiveWeekStart: null,
  };
  writeAllMeta(all);
}

export function setGardenersNote(goalId: string, text: string): void {
  if (typeof window === "undefined" || !text.trim()) return;
  try {
    const all = readAllNotes();
    all[goalId] = {
      text: text.trim(),
      expiresAt: new Date(Date.now() + NOTE_TTL_MS).toISOString(),
    };
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function getGardenersNote(goalId: string): string | null {
  if (typeof window === "undefined") return null;
  const all = readAllNotes();
  const note = all[goalId];
  if (!note) return null;
  if (new Date(note.expiresAt).getTime() <= Date.now()) {
    delete all[goalId];
    try {
      window.localStorage.setItem(NOTES_KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
    return null;
  }
  return note.text;
}

function readAllNotes(): Record<string, GardenersNoteRecord> {
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GardenersNoteRecord>;
  } catch {
    return {};
  }
}
