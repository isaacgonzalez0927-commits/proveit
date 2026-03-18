export interface ClipScore {
  label: string;
  score: number;
}

export interface ClipVerifyResult {
  verified: boolean;
  confidence: number; // 0..1
  topLabel: string;
  allScores: ClipScore[];
}

const NEGATIVE_LABELS = ["a random irrelevant picture", "a blank or unrelated photo"] as const;

function makeLabels(goalText: string): { all: string[]; positive: string[] } {
  const g = goalText.trim();
  const positive = [`a photo of ${g}`, `a person ${g}`];
  return { all: [...positive, ...NEGATIVE_LABELS], positive };
}

let pipelinePromise: Promise<(image: string, labels: string[]) => Promise<ClipScore[]>> | null = null;

async function getPipeline(modelId: string) {
  if (typeof window === "undefined") {
    throw new Error("CLIP verification is only available in the browser.");
  }
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const mod = await import("@huggingface/transformers");
      // Default behavior: download model from Hugging Face and cache it in browser.
      mod.env.allowLocalModels = false;
      const pipe = await mod.pipeline("zero-shot-image-classification", modelId);
      return async (imageDataUrl: string, labels: string[]) => {
        const raw = (await pipe(imageDataUrl, labels)) as ClipScore[];
        return raw;
      };
    })();
  }
  return pipelinePromise;
}

export async function verifyWithLocalClip(opts: {
  imageDataUrl: string;
  goalText: string;
  threshold?: number;
  modelId?: string;
}): Promise<ClipVerifyResult> {
  const threshold = opts.threshold ?? 0.55;
  const modelId = opts.modelId ?? "Xenova/clip-vit-base-patch32";
  const trimmed = opts.goalText.trim();
  if (!trimmed) throw new Error("goalText is required");
  if (!opts.imageDataUrl) throw new Error("imageDataUrl is required");

  const { all: labels, positive: positiveLabels } = makeLabels(trimmed);
  const pipe = await getPipeline(modelId);
  const scores = await pipe(opts.imageDataUrl, labels);
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const top = sorted[0] ?? { label: "unknown", score: 0 };
  return {
    verified: positiveLabels.includes(top.label) && top.score >= threshold,
    confidence: top.score,
    topLabel: top.label,
    allScores: sorted,
  };
}

