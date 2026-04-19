/**
 * CLIP zero-shot labels + scoring rules shared by `localClipVerify` and `AIVerificationWidget`.
 * Keep verification behavior identical between the proof submit path and the standalone widget.
 */

import {
  DEFAULT_CLIP_MAIN_WORD_FLOOR,
  DEFAULT_CLIP_VERIFY_MARGIN,
  DEFAULT_CLIP_VERIFY_THRESHOLD,
} from "./clipVerifyConstants";

export type ClipLabelScore = { label: string; score: number };

// Stronger negative label set — more options gives the softmax better
// alternatives for irrelevant images, so false-positives drop significantly.
const NEGATIVE_LABELS = [
  "a random irrelevant picture",
  "a blank or unrelated photo",
  "a completely different subject",
  "a screenshot or text document",
  "background scenery with nothing relevant",
  "an empty or meaningless image",
] as const;

// Common English words to strip before pulling out subjects/actions. Keeps
// "dog"/"walk" from "walk the dog", "gym"/"going" from "going to the gym".
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "my",
  "your",
  "our",
  "their",
  "his",
  "her",
  "its",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "and",
  "or",
  "but",
  "by",
  "from",
  "is",
  "am",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "do",
  "does",
  "did",
  "doing",
  "has",
  "have",
  "had",
  "having",
  "i",
  "me",
  "we",
  "us",
  "you",
  "he",
  "she",
  "it",
  "they",
  "them",
  "some",
  "any",
  "this",
  "that",
  "these",
  "those",
  "there",
  "here",
  "up",
  "down",
  "out",
  "into",
  "onto",
  "off",
  "over",
  "under",
]);

function extractKeyTerms(goal: string): string[] {
  const words = goal
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

const GOAL_EXPANSIONS: Record<string, string[]> = {
  "work out": ["dumbbells", "a gym", "exercise equipment", "a person exercising"],
  workout: ["dumbbells", "a gym", "exercise equipment", "a person exercising"],
  exercise: ["dumbbells", "a gym", "exercise equipment", "a person exercising"],
  exercising: ["dumbbells", "a gym", "exercise equipment", "a person exercising"],
  gym: ["dumbbells", "exercise equipment", "a weight rack", "a treadmill"],
  lift: ["dumbbells", "a barbell", "a weight rack"],
  lifting: ["dumbbells", "a barbell", "a weight rack"],
  weights: ["dumbbells", "a barbell", "a weight rack"],
  pushup: ["a person doing push-ups", "a person on the floor exercising"],
  pushups: ["a person doing push-ups", "a person on the floor exercising"],
  pullup: ["a pull-up bar", "a person doing pull-ups"],
  pullups: ["a pull-up bar", "a person doing pull-ups"],
  run: ["running shoes", "a running track", "a person running outside", "a park path"],
  running: ["running shoes", "a running track", "a person running outside", "a park path"],
  jog: ["running shoes", "a park path", "a person jogging"],
  jogging: ["running shoes", "a park path", "a person jogging"],
  walk: ["a walking path", "a sidewalk", "an outdoor path"],
  walking: ["a walking path", "a sidewalk", "an outdoor path"],
  hike: ["a hiking trail", "mountains", "a forest path"],
  hiking: ["a hiking trail", "mountains", "a forest path"],
  bike: ["a bicycle", "a bike path"],
  biking: ["a bicycle", "a bike path"],
  cycling: ["a bicycle", "a bike path"],
  swim: ["a swimming pool", "a person swimming"],
  swimming: ["a swimming pool", "a person swimming"],
  meditate: ["a person sitting cross-legged", "a calm quiet room", "a meditation cushion"],
  meditating: ["a person sitting cross-legged", "a calm quiet room", "a meditation cushion"],
  meditation: ["a person sitting cross-legged", "a calm quiet room", "a meditation cushion"],
  yoga: ["a yoga mat", "a person in a yoga pose"],
  stretch: ["a person stretching", "a yoga mat"],
  stretching: ["a person stretching", "a yoga mat"],
  read: ["an open book", "a stack of books", "a person reading"],
  reading: ["an open book", "a stack of books", "a person reading"],
  book: ["an open book", "a stack of books"],
  books: ["an open book", "a stack of books"],
  study: ["textbooks", "notes on a desk", "a student studying"],
  studying: ["textbooks", "notes on a desk", "a student studying"],
  homework: ["a notebook", "textbooks", "a desk with papers"],
  write: ["a notebook", "a pen and paper"],
  writing: ["a notebook", "a pen and paper"],
  journal: ["an open notebook", "a pen and a journal"],
  journaling: ["an open notebook", "a pen and a journal"],
  clean: ["a tidy room", "cleaning supplies", "a vacuum"],
  cleaning: ["a tidy room", "cleaning supplies", "a vacuum"],
  tidy: ["a tidy room", "an organized space"],
  room: ["a tidy bedroom"],
  laundry: ["a washing machine", "folded clothes", "a laundry basket"],
  dishes: ["a clean sink", "clean plates", "a dishwasher"],
  vacuum: ["a vacuum cleaner", "a clean floor"],
  cook: ["a kitchen", "a pan on a stove", "prepared food on a plate"],
  cooking: ["a kitchen", "a pan on a stove", "prepared food on a plate"],
  meal: ["a plate of food", "a home cooked meal"],
  breakfast: ["a plate of breakfast food", "eggs and toast"],
  lunch: ["a plate of lunch food", "a sandwich"],
  dinner: ["a plate of dinner food", "a home cooked meal"],
  water: ["a glass of water", "a water bottle"],
  hydrate: ["a glass of water", "a water bottle"],
  vitamins: ["a bottle of vitamins", "pills in a hand"],
  medication: ["a pill bottle", "medication"],
  sleep: ["a made bed", "a dark bedroom"],
  bed: ["a made bed", "a bedroom"],
  draw: ["a sketchbook", "a drawing", "art supplies"],
  drawing: ["a sketchbook", "a drawing", "art supplies"],
  paint: ["a painting", "paintbrushes", "an easel"],
  painting: ["a painting", "paintbrushes", "an easel"],
  practice: ["a musical instrument", "sheet music"],
  guitar: ["a guitar", "a person playing guitar"],
  piano: ["a piano", "a person playing piano"],
  dog: ["a dog", "a person with a dog", "a dog on a leash"],
  cat: ["a cat"],
  pet: ["a pet animal"],
};

/** Last meaningful keyword — used to bias CLIP toward the primary subject (e.g. "dog" in "walk the dog"). */
export function extractMainWord(goal: string): string | null {
  const terms = extractKeyTerms(goal);
  return terms.length > 0 ? terms[terms.length - 1]! : null;
}

function getExpansions(goal: string, terms: string[]): string[] {
  const lowerGoal = goal.toLowerCase();
  const termSet = new Set(terms);
  const out = new Set<string>();

  for (const [key, values] of Object.entries(GOAL_EXPANSIONS)) {
    const isPhrase = key.includes(" ");
    const matches = isPhrase ? lowerGoal.includes(key) : termSet.has(key);
    if (matches) values.forEach((v) => out.add(v));
  }

  return Array.from(out);
}

export function makeLabels(goalText: string): {
  all: string[];
  positive: string[];
  mainWord: string | null;
  mainWordLabels: string[];
} {
  const g = goalText.trim();
  const terms = extractKeyTerms(g);
  const expansions = getExpansions(g, terms);
  const mainWord = extractMainWord(g);
  const mainWordLabels = mainWord
    ? [
        `a photo of a ${mainWord}`,
        `a clear close-up of a ${mainWord}`,
        `${mainWord} clearly visible in the photo`,
      ]
    : [];

  const positive = [
    `a photo of ${g}`,
    `a person ${g}`,
    `a scene or environment for ${g}`,
    `equipment, tools, or items used for ${g}`,
    ...terms.flatMap((t) => [`a photo of a ${t}`, `a photo showing ${t}`]),
    ...expansions.map((e) => `a photo of ${e}`),
    ...mainWordLabels,
  ];

  const dedupedPositive = Array.from(new Set(positive));
  const dedupedMainWordLabels = Array.from(new Set(mainWordLabels));
  return {
    all: Array.from(new Set([...dedupedPositive, ...NEGATIVE_LABELS])),
    positive: dedupedPositive,
    mainWord,
    mainWordLabels: dedupedMainWordLabels,
  };
}

export type EvaluateClipLabelScoreOptions = {
  margin?: number;
  /** When non-empty, require sum of softmax scores on these labels ≥ `mainWordFloor`. */
  mainWordLabels?: readonly string[];
  mainWordFloor?: number;
};

/**
 * CLIP zero-shot uses one softmax over **all** labels. With many goal-related
 * positives, their scores **sum** to most of the mass on almost any image, so
 * a sum-based rule approves junk. We instead require the **global argmax** to
 * be a positive label, clear `threshold` on that label, and beat the best
 * negative by `margin` (defaults from `clipVerifyConstants`).
 */
export function evaluateClipLabelScores(
  scores: ClipLabelScore[],
  positiveLabels: readonly string[],
  threshold: number = DEFAULT_CLIP_VERIFY_THRESHOLD,
  opts?: EvaluateClipLabelScoreOptions
): {
  verified: boolean;
  confidence: number;
  topLabel: string;
  sorted: ClipLabelScore[];
} {
  const margin = opts?.margin ?? DEFAULT_CLIP_VERIFY_MARGIN;
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const top = sorted[0] ?? { label: "unknown", score: 0 };
  const positiveSet = new Set(positiveLabels);
  const topIsPositive = positiveSet.has(top.label);
  const maxPositiveScore = Math.max(
    0,
    ...scores.filter((s) => positiveSet.has(s.label)).map((s) => s.score)
  );
  const bestNegativeScore = Math.max(
    0,
    ...scores.filter((s) => !positiveSet.has(s.label)).map((s) => s.score)
  );
  let verified =
    topIsPositive &&
    top.score >= threshold &&
    top.score >= bestNegativeScore + margin;

  const mwl = opts?.mainWordLabels;
  const mwf = opts?.mainWordFloor ?? DEFAULT_CLIP_MAIN_WORD_FLOOR;
  if (verified && mwl && mwl.length > 0) {
    const mwSet = new Set(mwl);
    const mainWordScore = scores
      .filter((s) => mwSet.has(s.label))
      .reduce((sum, s) => sum + s.score, 0);
    if (mainWordScore < mwf) verified = false;
  }

  const confidence = topIsPositive ? top.score : maxPositiveScore;
  return { verified, confidence, topLabel: top.label, sorted };
}
