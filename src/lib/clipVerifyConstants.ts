/** Shared numbers only — safe to import from client pages without pulling in Transformers.js. */
export const DEFAULT_CLIP_MODEL_ID = "Xenova/clip-vit-base-patch32";

/**
 * Minimum softmax probability on the **winning** label when that label is goal-related.
 * We intentionally do **not** sum positive-label scores: with dozens of positives, their
 * softmax masses add up to a huge fraction (~#pos/#total) even on junk images.
 */
export const DEFAULT_CLIP_VERIFY_THRESHOLD = 0.2;

/** Winner must beat the strongest negative label by at least this much (same softmax). */
export const DEFAULT_CLIP_VERIFY_MARGIN = 0.008;

/** Minimum combined softmax on main-subject labels (see `makeLabels` main-word boost). */
export const DEFAULT_CLIP_MAIN_WORD_FLOOR = 0.032;

/**
 * When the global argmax is slightly below `threshold` but main-word labels clearly beat all
 * negatives (typical: clear photo of the object, verb-heavy goal like "use laptop"), allow verify
 * if best main-word score ≥ `threshold × this ratio`.
 */
export const CLIP_SUBJECT_THRESHOLD_RATIO = 0.52;

/**
 * When there are no main-word labels (phrase-style goals like "go to bed"), the old
 * `subjectSecondary` path does not run. This ratio scales `threshold` for a **soft** pass
 * when the softmax argmax is still a positive label and clearly beats negatives.
 */
/** Relaxed pass: softmax on a goal-positive argmax may be below full `threshold` (common on verbs). */
export const CLIP_PHRASE_SOFT_THRESHOLD_RATIO = 0.85;

/**
 * Slightly relaxed CLIP gates for the optional `AIVerificationWidget` only.
 * Camera / `localClipVerify` submit path keeps `DEFAULT_*` for consistency with stored proofs from the shutter.
 */
export const WIDGET_CLIP_VERIFY_THRESHOLD = 0.18;
export const WIDGET_CLIP_VERIFY_MARGIN = 0.006;
export const WIDGET_CLIP_MAIN_WORD_FLOOR = 0.03;
