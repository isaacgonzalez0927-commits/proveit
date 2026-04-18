import {
  DEFAULT_CLIP_MODEL_ID,
  DEFAULT_CLIP_VERIFY_THRESHOLD,
} from "./clipVerifyConstants";

export interface ClipScore {
  label: string;
  score: number;
}

export interface ClipVerifyResult {
  verified: boolean;
  confidence: number; // 0..1
  topLabel: string;
  /** Present for debugging; do not show per-label scores in end-user UI. */
  allScores: ClipScore[];
}

export type ClipLoadProgress = {
  status: string;
  progress?: number;
  file?: string;
};

const NEGATIVE_LABELS = ["a random irrelevant picture", "a blank or unrelated photo"] as const;

export { DEFAULT_CLIP_MODEL_ID, DEFAULT_CLIP_VERIFY_THRESHOLD };

function makeLabels(goalText: string): { all: string[]; positive: string[] } {
  const g = goalText.trim();
  const positive = [`a photo of ${g}`, `a person ${g}`];
  return { all: [...positive, ...NEGATIVE_LABELS], positive };
}

type ClipPipeline = (image: string, labels: string[]) => Promise<ClipScore[]>;

const pipelineByModelId = new Map<string, Promise<ClipPipeline>>();

function getPipeline(
  modelId: string,
  onProgress?: (info: ClipLoadProgress) => void
): Promise<ClipPipeline> {
  if (typeof window === "undefined") {
    throw new Error("CLIP verification is only available in the browser.");
  }
  let p = pipelineByModelId.get(modelId);
  if (!p) {
    p = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      const pipe = await pipeline(
        "zero-shot-image-classification",
        modelId,
        onProgress
          ? {
              progress_callback: (x: {
                status: string;
                progress?: number;
                file?: string;
              }) => {
                onProgress({
                  status: x.status,
                  progress: x.progress,
                  file: x.file,
                });
              },
            }
          : undefined
      );
      return async (imageDataUrl: string, labels: string[]) => {
        const raw = (await pipe(imageDataUrl, labels)) as ClipScore[];
        return raw;
      };
    })();
    pipelineByModelId.set(modelId, p);
  }
  return p;
}

/**
 * Await first-time CLIP download/init. Optional progress for UI (only used on first load for that model id).
 */
export function ensureLocalClipReady(
  modelId: string = DEFAULT_CLIP_MODEL_ID,
  onProgress?: (info: ClipLoadProgress) => void
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return getPipeline(modelId, onProgress).then(() => undefined);
}

/**
 * Start downloading / compiling the CLIP model early so the first verification feels faster.
 * Safe to call multiple times (deduped per model id).
 */
export function preloadLocalClipModel(
  modelId: string = DEFAULT_CLIP_MODEL_ID,
  onProgress?: (info: ClipLoadProgress) => void
): void {
  void ensureLocalClipReady(modelId, onProgress).catch(() => {
    /* user may retry on verify */
  });
}

/**
 * Single-line copy for verified / not-verified (one confidence %; threshold only when not verified).
 */
export function formatLocalClipUserFeedback(
  result: Pick<ClipVerifyResult, "verified" | "confidence">,
  threshold: number = DEFAULT_CLIP_VERIFY_THRESHOLD
): { confidencePct: number; thresholdPct: number; summaryLine: string } {
  const confidencePct = Math.round(result.confidence * 100);
  const thresholdPct = Math.round(threshold * 100);
  const summaryLine = result.verified
    ? `AI is ${confidencePct}% sure this matches your goal.`
    : `AI is ${confidencePct}% sure this matches your goal. At least ${thresholdPct}% is needed to verify.`;
  return { confidencePct, thresholdPct, summaryLine };
}

export async function verifyWithLocalClip(opts: {
  imageDataUrl: string;
  goalText: string;
  threshold?: number;
  modelId?: string;
}): Promise<ClipVerifyResult> {
  const threshold = opts.threshold ?? DEFAULT_CLIP_VERIFY_THRESHOLD;
  const modelId = opts.modelId ?? DEFAULT_CLIP_MODEL_ID;
  const trimmed = opts.goalText.trim();
  if (!trimmed) throw new Error("goalText is required");
  if (!opts.imageDataUrl) throw new Error("imageDataUrl is required");

  const { all: labels, positive: positiveLabels } = makeLabels(trimmed);
  const pipe = await getPipeline(modelId);
  const scores = await pipe(opts.imageDataUrl, labels);
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const top = sorted[0] ?? { label: "unknown", score: 0 };
  const confidence = scores
    .filter((s) => positiveLabels.includes(s.label))
    .reduce((sum, s) => sum + s.score, 0);
  return {
    verified: confidence >= threshold,
    confidence,
    topLabel: top.label,
    allScores: sorted,
  };
}
