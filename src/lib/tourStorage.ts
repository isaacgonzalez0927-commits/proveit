/** Dispatched when tour-related localStorage keys change (same-tab). */
export const TOUR_CHANGED_EVENT = "proveit-tour-changed";

export const TOUR_SPOTLIGHT_KEY = "proveit_tour_spotlight";

export type TourSpotlightPhase = "garden-tab" | "add-goal-button";

export function dispatchTourChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TOUR_CHANGED_EVENT));
  }
}
