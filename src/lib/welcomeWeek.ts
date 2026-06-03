import type { Goal, ProofSubmission } from "@/types";
import { countVerifiedInCalendarWeek } from "@/lib/goalDue";
import {
  isProratedSignupWeek,
  isSignupWeekQuotaMet,
  type GoalQuotaInput,
} from "@/lib/goalSchedule";
import { hasWelcomeWeekCompleted, markWelcomeWeekCompleted } from "@/lib/gardenMeta";
import { setWelcomeWeekFlash } from "@/lib/welcomeWeekFlash";

type SubmissionLike = Pick<ProofSubmission, "date" | "status">;

/** True when this verification just completed the prorated signup-week quota. */
export function isWelcomeWeekJustCompleted(
  goal: GoalQuotaInput & Pick<Goal, "id" | "title">,
  subsBefore: SubmissionLike[],
  subsAfter: SubmissionLike[],
  now: Date = new Date()
): boolean {
  if (!isProratedSignupWeek(goal, now)) return false;
  if (hasWelcomeWeekCompleted(goal.id)) return false;
  const before = countVerifiedInCalendarWeek(subsBefore, now);
  if (isSignupWeekQuotaMet(goal, before, now)) return false;
  const after = countVerifiedInCalendarWeek(subsAfter, now);
  return isSignupWeekQuotaMet(goal, after, now);
}

/** Persist welcome week + queue celebration flash. Returns true if newly completed. */
export function completeWelcomeWeekIfNeeded(
  goal: GoalQuotaInput & Pick<Goal, "id" | "title">,
  subsBefore: SubmissionLike[],
  subsAfter: SubmissionLike[],
  now: Date = new Date()
): boolean {
  if (!isWelcomeWeekJustCompleted(goal, subsBefore, subsAfter, now)) return false;
  const newlyCompleted = markWelcomeWeekCompleted(goal.id);
  if (newlyCompleted) {
    setWelcomeWeekFlash({ goalId: goal.id, goalTitle: goal.title });
  }
  return newlyCompleted;
}
