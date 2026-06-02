import type { PlantStageKey } from "@/components/PlantIllustration";
import type { PlantHealthState } from "@/lib/plantState";
import { setWateredGoalFlash } from "@/lib/wateredGoalFlash";

const KEY = "proveit_garden_proof_flash";

export type GardenProofFlash = {
  goalId: string;
  goalTitle: string;
  verified: boolean;
  stageBefore: PlantStageKey;
  stageAfter: PlantStageKey;
  healthBefore: PlantHealthState;
  healthAfter: PlantHealthState;
  stageUp: boolean;
  aiFeedback?: string;
};

export function setGardenProofFlash(flash: GardenProofFlash): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(flash));
    if (flash.verified) setWateredGoalFlash(flash.goalId);
  } catch {
    /* ignore */
  }
}

export function consumeGardenProofFlash(): GardenProofFlash | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GardenProofFlash;
  } catch {
    return null;
  }
}
