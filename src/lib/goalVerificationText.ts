import type { Goal } from "@/types";

/** CLIP / proof UI copy: derived from the goal title only (not a separate proof line). */
export function verificationTextFromGoal(goal: Pick<Goal, "title">): string {
  return goal.title.trim();
}
