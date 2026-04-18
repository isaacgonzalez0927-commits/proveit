export interface VerificationScore {
  label: string;
  score: number;
}

export interface VerificationResult {
  /** Whether the image was recognised as matching the goal */
  verified: boolean;
  /** Combined probability across all goal-matching labels, 0–1 */
  confidence: number;
  topLabel: string;
  goalName: string;
  allScores: VerificationScore[];
  /** Present on `onResult` so the host can save the same image (not shown in the widget UI). */
  imageDataUrl?: string;
}
