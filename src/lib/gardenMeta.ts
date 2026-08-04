import { addWeeks, parseISO } from "date-fns";
import type { Goal, ProofSubmission } from "@/types";
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
/** After a missed week: plant wilts for this many Sun–Sat weeks before death. */
export const WILT_GRACE_WEEKS = 2;

type SubmissionLike = Pick<ProofSubmission, "date" | "status">;

type GoalGardenMeta = {
  syncedWeekStart: string;
  perfectWeekStreak: number;
  /** Week through which bloom visuals are shown (inclusive). */
  bloomThroughWeekStart: string | null;
  /**
   * Inclusive Sun date of the last wilt-grace week.
   * After a miss in week W, set to W+2 (covers W+1 and W+2).
   */
  wiltThroughWeekStart: string | null;
  /** True after wilt expires with no revive proof until the next verified proof. */
  plantDead: boolean;
  /** One-time: prorated signup week quota was completed. */
  welcomeWeekCompleted?: boolean;
};

type GardenersNoteRecord = {
  text: string;
  expiresAt: string;
};

export type GardenWeekContext = {
  /** Plant is in the post-miss wilt grace window (not yet dead). */
  wiltActive: boolean;
  /** Alias of wiltActive — kept for older call sites / hydration fields. */
  recoveryActive: boolean;
  plantDead: boolean;
  /** 1 or 2 while wilting; null otherwise. */
  wiltWeekIndex: 1 | 2 | null;
  inBloomSeason: boolean;
  perfectWeekStreak: number;
};

function addWeekStart(weekStart: string, weeks: number): string {
  return weekStartKey(addWeeks(parseISO(weekStart), weeks));
}

function defaultMeta(weekStart: string): GoalGardenMeta {
  return {
    syncedWeekStart: weekStart,
    perfectWeekStreak: 0,
    bloomThroughWeekStart: null,
    wiltThroughWeekStart: null,
    plantDead: false,
  };
}

/** Migrate older recovery-season meta into wiltThrough / plantDead. */
function normalizeMeta(raw: Record<string, unknown>, weekStart: string): GoalGardenMeta {
  const base = defaultMeta(weekStart);
  const syncedWeekStart =
    typeof raw.syncedWeekStart === "string" ? raw.syncedWeekStart : weekStart;
  const perfectWeekStreak =
    typeof raw.perfectWeekStreak === "number" ? raw.perfectWeekStreak : 0;
  const bloomThroughWeekStart =
    typeof raw.bloomThroughWeekStart === "string" ? raw.bloomThroughWeekStart : null;
  const welcomeWeekCompleted = Boolean(raw.welcomeWeekCompleted);

  let wiltThroughWeekStart =
    typeof raw.wiltThroughWeekStart === "string" ? raw.wiltThroughWeekStart : null;
  let plantDead = Boolean(raw.plantDead);

  // Legacy once-per-month recovery week → 2-week wilt ending one week after that week.
  if (
    !wiltThroughWeekStart &&
    !plantDead &&
    typeof raw.recoveryActiveWeekStart === "string" &&
    raw.recoveryUsedInSeason !== true
  ) {
    wiltThroughWeekStart = addWeekStart(raw.recoveryActiveWeekStart, WILT_GRACE_WEEKS - 1);
  }

  return {
    ...base,
    syncedWeekStart,
    perfectWeekStreak,
    bloomThroughWeekStart,
    wiltThroughWeekStart,
    plantDead,
    welcomeWeekCompleted,
  };
}

function readAllMeta(): Record<string, GoalGardenMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;
    const out: Record<string, GoalGardenMeta> = {};
    const week = weekStartKey();
    for (const [id, value] of Object.entries(parsed)) {
      if (value && typeof value === "object") {
        out[id] = normalizeMeta(value, week);
      }
    }
    return out;
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

function weekEndedUnmet(
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

function wiltWeekIndexFor(
  currentWeek: string,
  wiltThroughWeekStart: string | null
): 1 | 2 | null {
  if (!wiltThroughWeekStart) return null;
  if (currentWeek > wiltThroughWeekStart) return null;
  const wiltStart = addWeekStart(wiltThroughWeekStart, -(WILT_GRACE_WEEKS - 1));
  if (currentWeek < wiltStart) return null;
  if (currentWeek === wiltStart) return 1;
  return 2;
}

function buildContext(meta: GoalGardenMeta, currentWeek: string): GardenWeekContext {
  const wiltActive =
    !meta.plantDead &&
    meta.wiltThroughWeekStart != null &&
    currentWeek <= meta.wiltThroughWeekStart &&
    currentWeek >= addWeekStart(meta.wiltThroughWeekStart, -(WILT_GRACE_WEEKS - 1));

  return {
    wiltActive,
    recoveryActive: wiltActive,
    plantDead: meta.plantDead,
    wiltWeekIndex: wiltActive ? wiltWeekIndexFor(currentWeek, meta.wiltThroughWeekStart) : null,
    inBloomSeason: meta.bloomThroughWeekStart === currentWeek,
    perfectWeekStreak: meta.perfectWeekStreak,
  };
}

/**
 * Sync week rollover: bloom streak, 2-week wilt grace after a miss, plant death.
 *
 * Week math (Sun–Sat, same as streaks):
 * - Miss week W (quota unmet) → wilt covers W+1 and W+2.
 * - Any verified proof during wilt (or while dead) clears wilt / revives plant.
 * - Streak is independent: a missed week already breaks the streak counter.
 * - If both wilt weeks pass with no revive → plantDead until the next proof.
 */
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

  if (meta.syncedWeekStart !== currentWeek) {
    let week = meta.syncedWeekStart;
    let guard = 0;
    while (week !== currentWeek && guard < 104) {
      guard += 1;
      const nextWeek = addWeekStart(week, 1);

      if (!goal.archivedAt) {
        // Leaving the final wilt week without a revive → plant dies.
        if (
          meta.wiltThroughWeekStart &&
          meta.wiltThroughWeekStart === week &&
          !meta.plantDead
        ) {
          meta = {
            ...meta,
            plantDead: true,
            wiltThroughWeekStart: null,
          };
        }

        if (!meta.plantDead && weekEndedUnmet(goal, submissions, graceDays, goalId, week)) {
          // First miss starts a fresh 2-week wilt (do not stack / extend mid-wilt).
          if (!meta.wiltThroughWeekStart) {
            meta = {
              ...meta,
              wiltThroughWeekStart: addWeekStart(nextWeek, WILT_GRACE_WEEKS - 1),
            };
          }
        }

        if (weekWasPerfect(goal, submissions, graceDays, week)) {
          const nextPerfect = meta.perfectWeekStreak + 1;
          if (nextPerfect >= BLOOM_PERFECT_WEEKS) {
            meta = {
              ...meta,
              perfectWeekStreak: 0,
              bloomThroughWeekStart: nextWeek,
            };
          } else {
            meta = { ...meta, perfectWeekStreak: nextPerfect };
          }
        } else if (
          !hasGraceDayForGoalWeek(graceDays, goalId, week) &&
          !isNeutralSignupWeekMiss(
            goal,
            parseISO(week),
            verifiedInWeek(submissions, week)
          )
        ) {
          meta = { ...meta, perfectWeekStreak: 0 };
        }
      }

      if (meta.bloomThroughWeekStart && meta.bloomThroughWeekStart < nextWeek) {
        meta = { ...meta, bloomThroughWeekStart: null };
      }

      week = nextWeek;
    }

    meta = { ...meta, syncedWeekStart: currentWeek };
    all[goalId] = meta;
    writeAllMeta(all);
  }

  return buildContext(meta, currentWeek);
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

/**
 * Call after a verified proof during wilt (or while dead).
 * Revives the plant; streak is not restored — it stays broken from the missed week.
 */
export function completeGardenRecovery(goalId: string): void {
  if (typeof window === "undefined") return;
  const all = readAllMeta();
  const meta = all[goalId];
  if (!meta) return;
  if (!meta.wiltThroughWeekStart && !meta.plantDead) return;
  all[goalId] = {
    ...meta,
    wiltThroughWeekStart: null,
    plantDead: false,
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
