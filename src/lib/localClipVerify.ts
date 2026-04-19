import {
  DEFAULT_CLIP_MAIN_WORD_FLOOR,
  DEFAULT_CLIP_MODEL_ID,
  DEFAULT_CLIP_VERIFY_THRESHOLD,
} from "./clipVerifyConstants";
import { evaluateClipLabelScores, makeLabels } from "./clipVerifyLabels";

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

export { DEFAULT_CLIP_MODEL_ID, DEFAULT_CLIP_VERIFY_THRESHOLD };

export type SharedClipRunner = (image: string, labels: string[]) => Promise<ClipScore[]>;

const pipelineByModelId = new Map<string, Promise<SharedClipRunner>>();

function getPipeline(
  modelId: string,
  onProgress?: (info: ClipLoadProgress) => void
): Promise<SharedClipRunner> {
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
 * Same WASM/CLIP singleton as `verifyWithLocalClip` (per `modelId`). Use from `AIVerificationWidget`
 * so the submit page never loads two models and the camera thread is not starved on first paint.
 */
export function getSharedClipPipeline(
  modelId: string = DEFAULT_CLIP_MODEL_ID,
  onProgress?: (info: ClipLoadProgress) => void
): Promise<SharedClipRunner> {
  return getPipeline(modelId, onProgress);
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

/** Single-line copy for proof storage — definitive yes/no wording (no confidence %). */
export function formatLocalClipUserFeedback(
  result: Pick<ClipVerifyResult, "verified" | "confidence">,
  _threshold: number = DEFAULT_CLIP_VERIFY_THRESHOLD
): { confidencePct: number; thresholdPct: number; summaryLine: string } {
  const confidencePct = Math.round(result.confidence * 100);
  const thresholdPct = Math.round(_threshold * 100);
  const summaryLine = result.verified
    ? "Verified — your photo matches this goal."
    : "Not verified — your photo doesn’t match this goal closely enough. Try a clearer shot of what you’re doing.";
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

  const { all: labels, positive: positiveLabels, mainWordLabels } = makeLabels(trimmed);
  const pipe = await getPipeline(modelId);
  const scores = await pipe(opts.imageDataUrl, labels);
  const { verified, confidence, topLabel, sorted } = evaluateClipLabelScores(
    scores,
    positiveLabels,
    threshold,
    {
      mainWordLabels,
      mainWordFloor: DEFAULT_CLIP_MAIN_WORD_FLOOR,
    }
  );
  return {
    verified,
    confidence,
    topLabel,
    allScores: sorted,
  };
}
