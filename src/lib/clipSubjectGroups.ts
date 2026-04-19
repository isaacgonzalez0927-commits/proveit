/**
 * Category-based visual hints for CLIP zero-shot labels. Each group fires when any
 * trigger appears in the goal text or in extracted key terms (see `groupMatches`).
 * Hints are short noun phrases — `makeLabels` turns them into full CLIP strings.
 */

export type SubjectGroup = {
  /** Stable id for debugging */
  id: string;
  /** Match whole phrase in goal (substring) or single token in `termSet` / goal tokens */
  triggers: readonly string[];
  /** Concrete scene / object phrases CLIP can score */
  hints: readonly string[];
};

/** Max hints pulled from groups per goal — keeps softmax label count reasonable. */
export const CLIP_SUBJECT_GROUP_HINT_CAP = 28;

const READING_HINTS = [
  "an open book",
  "a paperback or hardcover novel",
  "a stack of books on a desk",
  "a magazine or printed article",
  "a newspaper",
  "an e-reader or tablet showing book pages",
  "someone holding a book or e-reader",
  "a library bookshelf",
  "highlighted or annotated pages",
  "printed study notes beside a book",
  "a bookmark in an open book",
  "a reading lamp over a book",
  "a textbook open on a desk",
] as const;

const EXERCISE_GYM_HINTS = [
  "a gym interior with machines",
  "a treadmill or elliptical machine",
  "a barbell and weight plates",
  "dumbbells on a rack",
  "a cable machine or weight stack",
  "a squat rack in a gym",
  "a bench press station",
  "kettlebells on the floor",
  "a rowing machine",
  "a stair climber or step machine",
  "gym mirrors and rubber flooring",
  "a locker room towel and gym bag",
  "resistance bands being used",
] as const;

const EXERCISE_CARDIO_HINTS = [
  "running shoes on pavement",
  "a person jogging outdoors",
  "a bicycle on a path or trail",
  "a swimming pool lane",
  "a heart-rate watch or fitness tracker",
  "a park trail or sidewalk run",
  "a stationary bike or spin bike",
  "a jump rope",
  "hiking boots on a dirt trail",
] as const;

const BODYWEIGHT_HINTS = [
  "a person doing push-ups",
  "a pull-up bar with someone hanging",
  "a yoga mat on the floor",
  "a person in a plank pose",
  "a person stretching legs or arms",
  "a foam roller",
] as const;

const SLEEP_REST_HINTS = [
  "a made bed with pillows",
  "a dark bedroom at night",
  "a bedside lamp turned low",
  "an alarm clock on a nightstand",
  "sleep mask or earplugs",
  "cozy blankets",
  "a person under covers from above",
] as const;

const NUTRITION_HINTS = [
  "a glass of water",
  "a reusable water bottle",
  "a plate of healthy food",
  "a cutting board with vegetables",
  "a vitamin bottle or supplement tray",
  "a kitchen scale with food",
  "a smoothie in a glass",
  "meal prep containers",
] as const;

const WORK_SCREEN_HINTS = [
  "a laptop on a desk",
  "a laptop photographed from above closed or slightly open",
  "a laptop screen showing text or email",
  "hands typing on a laptop keyboard",
  "a desktop monitor with windows open",
  "a video call on a laptop screen",
  "a code editor on a monitor",
  "a spreadsheet on a screen",
  "a second monitor workspace",
  "a desk with mouse and notepad",
  "a MacBook-style aluminum laptop",
] as const;

const CLEANING_HOME_HINTS = [
  "a vacuum cleaner on carpet",
  "cleaning spray and microfiber cloth",
  "a mop and bucket",
  "folded laundry in a basket",
  "a dishwasher with clean dishes",
  "a tidy made bed",
  "organized desk drawers open neatly",
  "trash bags being taken out",
] as const;

const COOKING_HINTS = [
  "a stove with pan and steam",
  "chopped vegetables on a cutting board",
  "an oven with baking tray",
  "a plated home-cooked meal",
  "measuring cups and mixing bowl",
  "a recipe on a phone or tablet in kitchen",
  "spices lined up near stove",
] as const;

const MUSIC_HINTS = [
  "an acoustic guitar",
  "an electric guitar and cable",
  "a piano keyboard close-up",
  "sheet music on a stand",
  "a microphone and headphones",
  "a violin or cello",
  "a drum practice pad",
  "a ukulele",
] as const;

const PET_HINTS = [
  "a dog on a leash outdoors",
  "a dog being petted",
  "a cat sitting on furniture",
  "a pet food bowl",
  "a litter box area",
  "a small pet carrier",
] as const;

const ART_HINTS = [
  "a sketchbook with pencil drawings",
  "paintbrushes and palette",
  "an easel with canvas",
  "colored pencils or markers",
  "a digital drawing tablet",
] as const;

const WRITING_HINTS = [
  "a notebook with handwritten pages",
  "a pen writing on paper",
  "a laptop with a document draft",
  "sticky notes on a monitor",
  "a bullet journal layout",
  "a typewriter or keyboard close-up",
] as const;

const JOURNAL_HINTS = [
  "an open gratitude journal",
  "handwritten daily journal pages",
  "a dated journal entry visible",
  "a nice pen beside an open notebook",
] as const;

const MIND_BODY_HINTS = [
  "a meditation cushion on floor",
  "a person sitting cross-legged quietly",
  "incense or candles for calm space",
  "a yoga block and strap",
  "a calm indoor plant corner",
] as const;

export const SUBJECT_GROUPS: readonly SubjectGroup[] = [
  {
    id: "reading",
    triggers: [
      "read",
      "reading",
      "book",
      "books",
      "novel",
      "article",
      "literature",
      "kindle",
      "ebook",
      "magazine",
      "study",
      "studying",
      "homework",
      "textbook",
    ],
    hints: READING_HINTS,
  },
  {
    id: "exercise_gym",
    triggers: [
      "work out",
      "workout",
      "exercise",
      "exercising",
      "gym",
      "lift",
      "lifting",
      "weights",
      "treadmill",
      "elliptical",
      "barbell",
      "dumbbell",
      "squat",
      "deadlift",
      "bench",
      "crossfit",
      "strength",
    ],
    hints: EXERCISE_GYM_HINTS,
  },
  {
    id: "exercise_cardio",
    triggers: ["run", "running", "jog", "jogging", "bike", "biking", "cycling", "swim", "swimming", "hike", "hiking"],
    hints: EXERCISE_CARDIO_HINTS,
  },
  {
    id: "bodyweight",
    triggers: ["pushup", "pushups", "pullup", "pullups", "plank", "burpee", "stretch", "stretching", "yoga"],
    hints: BODYWEIGHT_HINTS,
  },
  {
    id: "sleep",
    triggers: ["sleep", "sleeping", "bed", "rest", "nap", "insomnia", "tired"],
    hints: SLEEP_REST_HINTS,
  },
  {
    id: "nutrition",
    triggers: ["water", "hydrate", "eat", "eating", "meal", "cook", "cooking", "breakfast", "lunch", "dinner", "vitamin", "vitamins", "diet"],
    hints: NUTRITION_HINTS,
  },
  {
    id: "work_screen",
    triggers: [
      "use my laptop",
      "use laptop",
      "using my laptop",
      "using laptop",
      "on my laptop",
      "laptop",
      "macbook",
      "computer",
      "typing",
      "email",
      "zoom",
      "code",
      "coding",
      "program",
      "programming",
      "spreadsheet",
      "slack",
      "desk",
    ],
    hints: WORK_SCREEN_HINTS,
  },
  {
    id: "cleaning",
    triggers: ["clean", "cleaning", "tidy", "laundry", "dishes", "vacuum", "organize", "declutter", "chore"],
    hints: CLEANING_HOME_HINTS,
  },
  {
    id: "cooking",
    triggers: ["cook", "cooking", "bake", "baking", "recipe", "kitchen"],
    hints: COOKING_HINTS,
  },
  {
    id: "music",
    triggers: ["guitar", "piano", "drum", "violin", "sing", "singing", "music", "practice"],
    hints: MUSIC_HINTS,
  },
  {
    id: "pets",
    triggers: ["dog", "cat", "pet", "puppy", "kitten", "walk the dog"],
    hints: PET_HINTS,
  },
  {
    id: "art",
    triggers: ["draw", "drawing", "paint", "painting", "sketch", "art", "illustrate"],
    hints: ART_HINTS,
  },
  {
    id: "mindfulness",
    triggers: ["meditate", "meditating", "meditation", "mindful", "breath", "calm"],
    hints: MIND_BODY_HINTS,
  },
  {
    id: "writing",
    triggers: ["write", "writing", "blog", "essay", "draft", "author"],
    hints: WRITING_HINTS,
  },
  {
    id: "journaling",
    triggers: ["journal", "journaling", "gratitude journal"],
    hints: JOURNAL_HINTS,
  },
] as const;

/** Split goal into loose tokens (lowercase alnum). */
function goalTokens(lowerGoal: string): Set<string> {
  const raw = lowerGoal.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/);
  return new Set(raw.filter((w) => w.length >= 2));
}

export function groupMatches(lowerGoal: string, termSet: Set<string>, triggers: readonly string[]): boolean {
  const tokens = goalTokens(lowerGoal);
  for (const t of triggers) {
    const tr = t.toLowerCase();
    if (tr.includes(" ")) {
      if (lowerGoal.includes(tr)) return true;
      continue;
    }
    if (termSet.has(tr) || tokens.has(tr)) return true;
  }
  return false;
}

/** Collect deduped hint strings from all matching subject groups (capped). */
export function subjectHintsForGoal(lowerGoal: string, termKeys: string[]): string[] {
  const termSet = new Set(termKeys.map((k) => k.toLowerCase()));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of SUBJECT_GROUPS) {
    if (!groupMatches(lowerGoal, termSet, group.triggers)) continue;
    for (const h of group.hints) {
      const key = h.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(h);
      if (out.length >= CLIP_SUBJECT_GROUP_HINT_CAP) return out;
    }
  }
  return out;
}

/** 2–3 CLIP label variants per hint (keeps list size bounded). */
export function clipLabelVariantsForSubjectHint(hint: string): string[] {
  const h = hint.trim();
  if (!h) return [];
  return [`a photo of ${h}`, `a clear photo showing ${h}`];
}
