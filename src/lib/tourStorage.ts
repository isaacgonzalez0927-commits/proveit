/** Dispatched when tour-related localStorage keys change (same-tab). */
export const TOUR_CHANGED_EVENT = "proveit-tour-changed";

export const TOUR_SPOTLIGHT_KEY = "proveit_tour_spotlight";
export const TOUR_DONE_KEY = "proveit_tour_done";
export const TOUR_DONE_VERSION = "3";
export const TOUR_START_KEY = "proveit_start_tour";
export const TOUR_RESUME_KEY = "proveit_tour_resume_step";
export const TOUR_GARDEN_HINT_KEY = "proveit_tour_garden_hint";
/** Set while a new user should complete the dashboard tour before the plan picker. Value = user id. */
export const PENDING_PLAN_AFTER_TOUR_KEY = "proveit_pending_plan_after_tour";

export type TourSpotlightPhase =
  | "garden-tab"
  | "add-goal-button"
  | "goal-title"
  | "goal-proof-fetch"
  | "goal-proof-pick"
  | "goal-schedule"
  | "goal-submit";

export function isGoalFormTourPhase(phase: string | null | undefined): boolean {
  return typeof phase === "string" && phase.startsWith("goal-");
}

export function dispatchTourChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TOUR_CHANGED_EVENT));
  }
}

/** Marks the dashboard tour finished, clears spotlight keys, then sends pending users to the plan step on `/`. */
export function completeDashboardTour(userId: string | undefined): void {
  if (typeof window === "undefined") return;
  const pendingUid = window.localStorage.getItem(PENDING_PLAN_AFTER_TOUR_KEY);
  const goPlan = Boolean(pendingUid && userId && pendingUid === userId);

  window.localStorage.setItem(TOUR_DONE_KEY, TOUR_DONE_VERSION);
  window.localStorage.removeItem(TOUR_START_KEY);
  window.localStorage.removeItem(TOUR_GARDEN_HINT_KEY);
  window.localStorage.removeItem(TOUR_RESUME_KEY);
  window.localStorage.removeItem(TOUR_SPOTLIGHT_KEY);
  dispatchTourChanged();

  if (goPlan) {
    window.location.assign("/?step=plan");
  }
}
