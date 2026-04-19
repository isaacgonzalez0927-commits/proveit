/** Shared numbers only — safe to import from client pages without pulling in Transformers.js. */
export const DEFAULT_CLIP_MODEL_ID = "Xenova/clip-vit-base-patch32";

/**
 * Minimum softmax probability on the **winning** label when that label is goal-related.
 * We intentionally do **not** sum positive-label scores: with dozens of positives, their
 * softmax masses add up to a huge fraction (~#pos/#total) even on junk images.
 */
export const DEFAULT_CLIP_VERIFY_THRESHOLD = 0.28;

/** Winner must beat the strongest negative label by at least this much (same softmax). */
export const DEFAULT_CLIP_VERIFY_MARGIN = 0.02;

/** Minimum combined softmax on main-subject labels (see `makeLabels` main-word boost). */
export const DEFAULT_CLIP_MAIN_WORD_FLOOR = 0.1;
