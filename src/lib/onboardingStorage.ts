import { clearPostPlanWelcomeFlag } from "@/lib/postPlanWelcome";
import { clearStoredPlanSelection } from "@/lib/store";
import {
  dispatchTourChanged,
  PENDING_PLAN_AFTER_TOUR_KEY,
  resetDashboardTour,
  TOUR_GARDEN_HINT_KEY,
  TOUR_RESUME_KEY,
  TOUR_SPOTLIGHT_KEY,
} from "@/lib/tourStorage";

export const INTRO_SEEN_KEY = "proveit_intro_seen";
export const DEV_GUEST_MODE_KEY = "proveit_dev_guest_mode";

export function isDevGuestModeActive(): boolean {
  return (
    typeof window !== "undefined" &&
    window.localStorage.getItem(DEV_GUEST_MODE_KEY) === "1"
  );
}

/** True while the marketing slideshow should run instead of jumping to plan picker. */
export function shouldShowOnboardingSlideshow(): boolean {
  return isDevGuestModeActive();
}

/** Clears intro splash, tour, and plan-picker state for a dev “new user” replay. */
export function resetOnboardingForDevExperience(userId?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(INTRO_SEEN_KEY);
  window.localStorage.removeItem("proveit_notification_prompt_dismissed");
  clearPostPlanWelcomeFlag();
  window.localStorage.removeItem(PENDING_PLAN_AFTER_TOUR_KEY);
  window.localStorage.removeItem(TOUR_GARDEN_HINT_KEY);
  window.localStorage.removeItem(TOUR_RESUME_KEY);
  window.localStorage.removeItem(TOUR_SPOTLIGHT_KEY);
  resetDashboardTour();
  dispatchTourChanged();
  if (userId) clearStoredPlanSelection(userId);
}
