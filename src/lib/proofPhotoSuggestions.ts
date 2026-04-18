/**
 * Short, goal-based photo ideas for the proof flow (no ML — safe to import anywhere).
 * Uses the same copy as the CLIP demo widget; 2–3 lines for flexibility.
 */
export function getProofPhotoSuggestions(goalText: string): string[] {
  const g = goalText.trim();
  if (!g) return [];
  return [
    `Take a selfie while ${g}`,
    `Take a photo of the place or setup for ${g}`,
    `Take a photo of any equipment or items you're using for ${g}`,
  ];
}
