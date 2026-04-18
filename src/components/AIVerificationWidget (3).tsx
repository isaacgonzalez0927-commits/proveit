"use client";

/**
 * AIVerificationWidget (3)
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in React component for AI-powered goal verification.
 * Uses CLIP via Transformers.js — 100% local, zero external API calls.
 *
 * ─── Peer dependency ────────────────────────────────────────────────────────
 *   npm install @huggingface/transformers
 *
 * ─── Usage ──────────────────────────────────────────────────────────────────
 *   import AIVerificationWidget from './AIVerificationWidget (3)';
 *
 *   <AIVerificationWidget
 *     onResult={(result) => console.log(result.verified, result.confidence)}
 *   />
 *
 * ─── Compatibility ──────────────────────────────────────────────────────────
 *   ✅ Vite, Create React App, Next.js (add "use client" at call site), Expo Web
 *   ✅ No Tailwind, no CSS modules, no router — fully self-contained
 *   ⚠️  Requires a browser with WebAssembly support (~300 MB model, cached
 *       in the browser after first download via the Cache API)
 *   ❌ Native React Native (no WASM runtime on device)
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type CSSProperties,
} from "react";
import type { VerificationResult, VerificationScore } from "@/types/aivVerification";

export type { VerificationResult, VerificationScore } from "@/types/aivVerification";

export interface AIVerificationWidgetProps {
  /** Fired whenever a verification attempt finishes */
  onResult?: (result: VerificationResult) => void;
  /**
   * Minimum confidence (0–1) required to mark the result as verified.
   * @default 0.55
   */
  threshold?: number;
  /**
   * Any HuggingFace zero-shot-image-classification model ID.
   * @default 'Xenova/clip-vit-base-patch32'
   */
  modelId?: string;
  /** Extra class name applied to the widget's root element */
  className?: string;
  /** Extra inline styles applied to the widget's root element */
  style?: CSSProperties;
  /** When set, seeds the goal field once (e.g. current goal proof line from the host page). */
  initialGoalText?: string;
  /**
   * Optional lines for the purple “proof photo ideas” box (e.g. `goal.proofSuggestions` + fallbacks from the host).
   * When non-empty, shown instead of the built-in `generateSuggestions` templates.
   */
  prefetchedPhotoIdeas?: string[];
  /**
   * When set (e.g. goal title), shows “Get AI photo ideas” which calls `POST /api/goals/proof-suggestions`
   * — same pipeline as Buddy (OpenAI / your API / mock).
   */
  ideasFetchTitle?: string;
}

// ─── Label generation ─────────────────────────────────────────────────────────

const NEGATIVE_LABELS = [
  'a random irrelevant picture',
  'a blank or unrelated photo',
] as const;

const EXAMPLE_GOALS = [
  'cleaning my room',
  'going to the gym',
  'cooking a meal',
  'reading a book',
  'doing homework',
  'taking a walk outside',
  'meditating',
  'journaling',
];

function makeLabels(goalText: string): { all: string[]; positive: string[] } {
  const g = goalText.trim();
  const positive = [`a photo of ${g}`, `a person ${g}`];
  return { all: [...positive, ...NEGATIVE_LABELS], positive };
}

// Generates proof photo suggestions that are DIRECTLY aligned with what the
// CLIP model scores against (the two positive labels in `makeLabels`:
// "a photo of ${g}" and "a person ${g}").
//
// Each suggestion is just a different camera angle/framing of the same
// underlying scene CLIP is looking for — so following ANY of them should
// score high on at least one of the positive labels.
function generateSuggestions(goalText: string): string[] {
  const g = goalText.trim();
  return [
    // Framing #1 — action shot. Matches both positive labels strongly.
    `A clear photo of you actively ${g}`,
    // Framing #2 — selfie angle. Matches "a person ${g}" strongly.
    `A selfie or self-taken shot that clearly shows you ${g}`,
    // Framing #3 — wide shot. Matches "a photo of ${g}" strongly.
    `A wider photo showing the full scene of you ${g}`,
  ];
}

// ─── Scoped CSS (injected once via <style id="aivw-styles">) ──────────────────

const CSS = `
.aivw*{box-sizing:border-box}
.aivw{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1e293b;width:100%}

/* ── card ── */
.aivw-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:24px}

/* ── loading banner ── */
.aivw-banner{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px}
.aivw-banner-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.aivw-spin-wrap{width:32px;height:32px;border-radius:50%;background:#ede9fe;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.aivw-spin{width:16px;height:16px;border:2.5px solid #ddd6fe;border-top-color:#7c3aed;border-radius:50%;animation:aivw-rotate .7s linear infinite}
@keyframes aivw-rotate{to{transform:rotate(360deg)}}
.aivw-bar-track{width:100%;height:8px;border-radius:999px;background:#f1f5f9;overflow:hidden}
.aivw-bar-fill{height:8px;border-radius:999px;background:linear-gradient(90deg,#7c3aed,#a855f7);transition:width .3s ease}

/* ── field label ── */
.aivw-field-label{display:block;font-size:15px;font-weight:600;color:#475569;margin:0 0 10px}

/* ── text input ── */
.aivw-input-wrap{position:relative}
.aivw-input{width:100%;border:2px solid #e2e8f0;border-radius:12px;padding:11px 38px 11px 14px;font-size:14px;color:#1e293b;background:#fff;outline:none;transition:border-color .15s;font-family:inherit}
.aivw-input::placeholder{color:#94a3b8}
.aivw-input:focus{border-color:#a78bfa}
.aivw-input.filled{border-color:#7c3aed}
.aivw-input:disabled{opacity:.55;cursor:not-allowed;background:#f8fafc}
.aivw-x{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;padding:4px;cursor:pointer;color:#94a3b8;line-height:0;border-radius:4px}
.aivw-x:hover{color:#64748b}
.aivw-x:disabled{opacity:.4;cursor:not-allowed}

/* ── example chips ── */
.aivw-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.aivw-chip{padding:4px 12px;border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;font-size:12px;color:#64748b;cursor:pointer;transition:border-color .12s,background .12s,color .12s;font-family:inherit}
.aivw-chip:hover:not(:disabled){border-color:#c4b5fd;background:#f5f3ff;color:#7c3aed}
.aivw-chip:disabled{opacity:.45;cursor:not-allowed}

/* ── photo suggestions ── */
.aivw-sugg{background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:12px 14px;margin-top:10px}
.aivw-sugg-hdr{display:flex;align-items:center;gap:6px;margin:0 0 10px}
.aivw-sugg-title{font-size:11px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;margin:0}
.aivw-sugg-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.aivw-sugg-item{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;color:#3b0764;line-height:1.4}
.aivw-sugg-bullet{width:18px;height:18px;border-radius:50%;background:#ede9fe;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.aivw-sugg-foot{margin:10px 0 0;padding-top:8px;border-top:1px dashed #e9d5ff;font-size:10.5px;color:#7c3aed;line-height:1.45}
.aivw-sugg-foot code{background:rgba(124,58,237,.08);padding:1px 5px;border-radius:4px;font-family:ui-monospace,Consolas,monospace;font-size:10px;color:#5b21b6}

/* ── divider ── */
.aivw-hr{border:none;border-top:1px solid #f1f5f9;margin:0}

/* ── drop zone ── */
.aivw-drop{border:2px dashed #cbd5e1;border-radius:12px;padding:36px 16px;display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;transition:border-color .15s,background .15s;text-align:center;background:#fff}
.aivw-drop:hover,.aivw-drop.dragging{border-color:#a78bfa;background:#faf5ff}
.aivw-drop.off{opacity:.55;cursor:not-allowed;pointer-events:none}
.aivw-drop-icon{width:48px;height:48px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center}
.aivw-drop.dragging .aivw-drop-icon{background:#ede9fe}

/* ── image preview ── */
.aivw-img-wrap{position:relative;border-radius:12px;overflow:hidden;border:2px solid #c4b5fd;background:#f8fafc}
.aivw-img{width:100%;max-height:240px;object-fit:contain;display:block}
.aivw-img-rm{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.92);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#475569;box-shadow:0 1px 4px rgba(0,0,0,.18)}
.aivw-img-rm:hover{background:#fff;color:#1e293b}
.aivw-img-rm:disabled{opacity:.4;cursor:not-allowed}

/* ── verify button ── */
.aivw-btn{width:100%;padding:14px;border-radius:12px;border:none;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .15s,box-shadow .15s;font-family:inherit}
.aivw-btn-on{background:#7c3aed;color:#fff;box-shadow:0 2px 10px rgba(124,58,237,.3)}
.aivw-btn-on:hover{background:#6d28d9}
.aivw-btn-off{background:#f1f5f9;color:#94a3b8;cursor:not-allowed}
.aivw-btn-spin{width:15px;height:15px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:aivw-rotate .7s linear infinite;flex-shrink:0}

/* ── hint ── */
.aivw-hint{text-align:center;font-size:12px;color:#94a3b8}

/* ── error box ── */
.aivw-err-box{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;font-size:12px;color:#b91c1c}

/* ── model error banner ── */
.aivw-model-err{background:#fef2f2;border:2px solid #fecaca;border-radius:16px;padding:22px;text-align:center}
.aivw-reload-btn{margin-top:12px;padding:8px 18px;font-size:13px;font-weight:500;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit}
.aivw-reload-btn:hover{background:#b91c1c}

/* ── result card ── */
.aivw-res{border-radius:16px;border:2px solid;padding:24px}
.aivw-res-ok{border-color:#a7f3d0;background:#ecfdf5}
.aivw-res-fail{border-color:#fecaca;background:#fef2f2}
.aivw-res-top{display:flex;align-items:flex-start;gap:16px}
.aivw-res-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.aivw-res-icon-ok{background:#d1fae5}
.aivw-res-icon-fail{background:#fee2e2}
.aivw-res-title{font-size:19px;font-weight:700;margin:0 0 4px}
.aivw-res-title-ok{color:#065f46}
.aivw-res-title-fail{color:#7f1d1d}
.aivw-res-desc{font-size:13px;margin:0}
.aivw-res-desc-ok{color:#047857}
.aivw-res-desc-fail{color:#b91c1c}
.aivw-conf-hdr{display:flex;justify-content:space-between;align-items:center;margin:14px 0 5px}
.aivw-conf-name{font-size:12px;font-weight:500}
.aivw-conf-name-ok{color:#047857}
.aivw-conf-name-fail{color:#b91c1c}
.aivw-conf-val{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}
.aivw-conf-val-ok{color:#065f46}
.aivw-conf-val-fail{color:#7f1d1d}
.aivw-conf-track{width:100%;height:10px;background:rgba(255,255,255,.65);border-radius:999px;overflow:hidden}
.aivw-conf-fill{height:10px;border-radius:999px;transition:width .7s ease}
.aivw-conf-fill-ok{background:#10b981}
.aivw-conf-fill-fail{background:#f87171}
.aivw-conf-note{font-size:11px;margin:5px 0 0}
.aivw-conf-note-ok{color:#059669}
.aivw-conf-note-fail{color:#ef4444}
.aivw-match-note{margin:10px 0 0;font-size:12px}
.aivw-match-note-ok{color:#047857}
.aivw-match-note-fail{color:#b91c1c}
.aivw-reset-btn{width:100%;margin-top:16px;padding:10px 16px;border-radius:10px;background:#fff;border:1px solid #e2e8f0;font-size:13px;font-weight:500;color:#475569;cursor:pointer;transition:background .12s,border-color .12s;font-family:inherit}
.aivw-reset-btn:hover{background:#f8fafc;border-color:#cbd5e1}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIVerificationWidget({
  onResult,
  threshold = 0.55,
  modelId = "Xenova/clip-vit-base-patch32",
  className = "",
  style,
  initialGoalText,
  prefetchedPhotoIdeas,
  ideasFetchTitle,
}: AIVerificationWidgetProps) {
  type Status = 'loading' | 'ready' | 'error';

  const [modelStatus, setModelStatus] = useState<Status>('loading');
  const [loadPct, setLoadPct] = useState(0);
  const [loadFile, setLoadFile] = useState('');
  const [modelErr, setModelErr] = useState<string | null>(null);

  const [goalText, setGoalText] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  /** In-widget refresh from `/api/goals/proof-suggestions` (overrides prefetched list when set). */
  const [serverPhotoIdeas, setServerPhotoIdeas] = useState<string[] | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasErr, setIdeasErr] = useState<string | null>(null);

  type ClipClassifyFn = (image: string, labels: string[]) => Promise<VerificationScore[]>;
  const pipelineRef = useRef<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = modelStatus === "ready" && !isVerifying;

  useEffect(() => {
    const g = initialGoalText?.trim();
    if (!g) return;
    setGoalText((prev) => (prev.trim() ? prev : g));
  }, [initialGoalText]);

  // ── Inject scoped CSS once ───────────────────────────────────────────────
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('aivw-styles')) return;
    const el = document.createElement('style');
    el.id = 'aivw-styles';
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  // ── Load CLIP model ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { pipeline, env } = await import("@huggingface/transformers");
        env.allowLocalModels = false;
        pipelineRef.current = await pipeline(
          "zero-shot-image-classification",
          modelId,
          {
            progress_callback: (p: { status: string; progress?: number; file?: string }) => {
              if (cancelled) return;
              if (p.status === "progress" && p.progress != null) {
                setLoadPct(Math.min(99, p.progress));
                setLoadFile(p.file ?? "");
              }
            },
          }
        );
        if (!cancelled) {
          setLoadPct(100);
          setTimeout(() => setModelStatus('ready'), 300);
        }
      } catch (err) {
        if (!cancelled) {
          setModelStatus('error');
          setModelErr(String(err));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [modelId]);

  // ── Image loading ────────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (typeof data === 'string') {
        setImageData(data);
        setResult(null);
        setVerifyErr(null);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  // ── Run CLIP on main thread ──────────────────────────────────────────────
  const handleVerify = async () => {
    const trimmed = goalText.trim();
    const pipe = pipelineRef.current as ClipClassifyFn | null;
    if (!trimmed || !imageData || !pipe) return;

    setIsVerifying(true);
    setResult(null);
    setVerifyErr(null);

    // Yield to the browser so the "Analyzing…" state paints before WASM runs
    await new Promise<void>((r) => setTimeout(r, 50));

    try {
      const { all: labels, positive: positiveLabels } = makeLabels(trimmed);
      const raw: VerificationScore[] = await pipe(imageData, labels);
      const sorted = [...raw].sort((a, b) => b.score - a.score);
      const top = sorted[0];

      // Confidence = combined probability across ALL goal-matching labels.
      // This gives one clean number: "how much does the model think this photo
      // relates to the goal?" vs spreading scores across 4 individual labels.
      const confidence = raw
        .filter((s) => positiveLabels.includes(s.label))
        .reduce((sum, s) => sum + s.score, 0);

      const res: VerificationResult = {
        verified: confidence >= threshold,
        confidence,
        topLabel: top.label,
        goalName: trimmed,
        allScores: sorted,
      };

      setResult(res);
      onResult?.({ ...res, imageDataUrl: imageData });
    } catch (err) {
      setVerifyErr(String(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setImageData(null);
    setGoalText('');
    setVerifyErr(null);
    setServerPhotoIdeas(null);
    setIdeasErr(null);
  };

  const fetchServerIdeas = useCallback(async () => {
    const t = ideasFetchTitle?.trim();
    if (!t || t.length < 2) return;
    setIdeasLoading(true);
    setIdeasErr(null);
    try {
      const res = await fetch("/api/goals/proof-suggestions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      const data = (await res.json()) as { suggestions?: unknown; error?: string };
      if (!res.ok) {
        setIdeasErr(typeof data.error === "string" ? data.error : "Could not load ideas.");
        return;
      }
      const list = Array.isArray(data.suggestions)
        ? data.suggestions
            .filter((x): x is string => typeof x === "string")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      if (list.length < 2) {
        setIdeasErr("Not enough suggestions. Check production env or try again.");
        return;
      }
      setServerPhotoIdeas(list.slice(0, 3));
    } catch {
      setIdeasErr("Network error loading ideas.");
    } finally {
      setIdeasLoading(false);
    }
  }, [ideasFetchTitle]);

  useEffect(() => {
    setServerPhotoIdeas(null);
    setIdeasErr(null);
  }, [ideasFetchTitle]);

  const trimmedGoal = goalText.trim();

  const suggestionLines = useMemo(() => {
    if (serverPhotoIdeas && serverPhotoIdeas.length > 0) {
      return serverPhotoIdeas.slice(0, 3);
    }
    const pre = (prefetchedPhotoIdeas ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
    if (pre.length > 0) return pre.slice(0, 3);
    return trimmedGoal ? generateSuggestions(trimmedGoal) : [];
  }, [serverPhotoIdeas, prefetchedPhotoIdeas, trimmedGoal]);

  const suggBoxTitle =
    serverPhotoIdeas && serverPhotoIdeas.length > 0
      ? "AI photo ideas"
      : (prefetchedPhotoIdeas ?? []).some((s) => s.trim())
        ? "Photo ideas (this goal)"
        : "Proof photo ideas";

  const usingClipTemplateFoot =
    !(serverPhotoIdeas && serverPhotoIdeas.length > 0) &&
    !(prefetchedPhotoIdeas ?? []).some((s) => s.trim()) &&
    !!trimmedGoal;

  const canVerify = !!trimmedGoal && !!imageData && active;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`aivw ${className}`} style={style}>

      {/* ── Model loading ── */}
      {modelStatus === 'loading' && (
        <div className="aivw-banner">
          <div className="aivw-banner-row">
            <div className="aivw-spin-wrap">
              <div className="aivw-spin" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                Loading AI model…
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {loadFile ? `Downloading ${loadFile.split('/').pop()}` : 'Cached after first download'}
              </p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(loadPct)}%
            </span>
          </div>
          <div className="aivw-bar-track">
            <div className="aivw-bar-fill" style={{ width: `${loadPct}%` }} />
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '8px 0 0' }}>
            CLIP model (~300 MB) — only downloaded on first use
          </p>
        </div>
      )}

      {/* ── Model error ── */}
      {modelStatus === 'error' && (
        <div className="aivw-model-err">
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#7f1d1d' }}>
            Failed to load AI model
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#b91c1c' }}>
            {modelErr ?? 'Unknown error — check the browser console for details.'}
          </p>
          <button className="aivw-reload-btn" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      )}

      {/* ── Verification result ── */}
      {result && (
        <div className={`aivw-res ${result.verified ? 'aivw-res-ok' : 'aivw-res-fail'}`}>
          <div className="aivw-res-top">
            <div className={`aivw-res-icon ${result.verified ? 'aivw-res-icon-ok' : 'aivw-res-icon-fail'}`}>
              {result.verified ? '✅' : '❌'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className={`aivw-res-title ${result.verified ? 'aivw-res-title-ok' : 'aivw-res-title-fail'}`}>
                {result.verified ? 'Goal Verified!' : 'Not Verified'}
              </h3>
              <p className={`aivw-res-desc ${result.verified ? 'aivw-res-desc-ok' : 'aivw-res-desc-fail'}`}>
                {result.verified
                  ? `Your photo confirms you completed "${result.goalName}".`
                  : `The photo didn't match "${result.goalName}" with enough confidence.`}
              </p>

              {/* Confidence bar */}
              <div className="aivw-conf-hdr">
                <span className={`aivw-conf-name ${result.verified ? 'aivw-conf-name-ok' : 'aivw-conf-name-fail'}`}>
                  Confidence
                </span>
                <span className={`aivw-conf-val ${result.verified ? 'aivw-conf-val-ok' : 'aivw-conf-val-fail'}`}>
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
              <div className="aivw-conf-track">
                <div
                  className={`aivw-conf-fill ${result.verified ? 'aivw-conf-fill-ok' : 'aivw-conf-fill-fail'}`}
                  style={{ width: `${Math.round(result.confidence * 100)}%` }}
                />
              </div>
              <p className={`aivw-conf-note ${result.verified ? 'aivw-conf-note-ok' : 'aivw-conf-note-fail'}`}>
                Threshold: {Math.round(threshold * 100)}% required to verify
              </p>
            </div>
          </div>

          {/* Single-line match note */}
          <p className={`aivw-match-note ${result.verified ? 'aivw-match-note-ok' : 'aivw-match-note-fail'}`}>
            {result.verified
              ? `The AI is ${Math.round(result.confidence * 100)}% sure this photo matches your goal.`
              : `The AI is only ${Math.round(result.confidence * 100)}% sure — ${Math.round(threshold * 100)}% is needed to verify.`
            }
          </p>

          <button className="aivw-reset-btn" onClick={handleReset}>
            Try again
          </button>
        </div>
      )}

      {/* ── Main form ── */}
      {!result && modelStatus !== 'error' && (
        <div className="aivw-card">

          {/* Step 1 — Goal input */}
          <div>
            <label htmlFor="aivw-goal-input" className="aivw-field-label">
              Step 1 — What&apos;s your goal?
            </label>
            <div className="aivw-input-wrap">
              <input
                id="aivw-goal-input"
                type="text"
                value={goalText}
                onChange={(e) => { setGoalText(e.target.value); setVerifyErr(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
                placeholder="e.g. cleaning my room, reading a book…"
                disabled={!active}
                maxLength={80}
                className={`aivw-input${trimmedGoal ? ' filled' : ''}`}
              />
              {trimmedGoal && (
                <button
                  className="aivw-x"
                  onClick={() => setGoalText('')}
                  disabled={!active}
                  aria-label="Clear goal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Quick-pick chips */}
            {!trimmedGoal && (
              <div className="aivw-chips">
                {EXAMPLE_GOALS.map((eg) => (
                  <button
                    key={eg}
                    className="aivw-chip"
                    onClick={() => setGoalText(eg)}
                    disabled={!active}
                  >
                    {eg}
                  </button>
                ))}
              </div>
            )}

            {/* Photo proof suggestions */}
            {trimmedGoal && (
              <div className="aivw-sugg">
                <div
                  className="aivw-sugg-hdr"
                  style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <p className="aivw-sugg-title" style={{ margin: 0 }}>
                      {suggBoxTitle}
                    </p>
                  </div>
                  {ideasFetchTitle && ideasFetchTitle.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={() => void fetchServerIdeas()}
                      disabled={!active || ideasLoading}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#6d28d9",
                        background: "#f5f3ff",
                        border: "1px solid #e9d5ff",
                        borderRadius: 8,
                        padding: "4px 10px",
                        cursor: active && !ideasLoading ? "pointer" : "not-allowed",
                        opacity: active && !ideasLoading ? 1 : 0.65,
                        fontFamily: "inherit",
                        flexShrink: 0,
                      }}
                    >
                      {ideasLoading ? "Loading…" : "Get AI ideas"}
                    </button>
                  )}
                </div>
                {ideasErr ? (
                  <p style={{ margin: "8px 0 0", fontSize: 11, color: "#b91c1c" }}>{ideasErr}</p>
                ) : null}
                <ul className="aivw-sugg-list">
                  {suggestionLines.map((s) => (
                    <li key={s} className="aivw-sugg-item">
                      <span className="aivw-sugg-bullet">
                        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 20 20" fill="#7c3aed">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
                <p className="aivw-sugg-foot">
                  {usingClipTemplateFoot ? (
                    <>
                      The AI passes your photo if it looks like{" "}
                      <code>&ldquo;a photo of {trimmedGoal}&rdquo;</code> or{" "}
                      <code>&ldquo;a person {trimmedGoal}&rdquo;</code>. Each idea above is one way to capture
                      exactly that.
                    </>
                  ) : serverPhotoIdeas && serverPhotoIdeas.length > 0 ? (
                    <>
                      These lines were just loaded from your app&apos;s server (same as Buddy). Local CLIP still
                      compares your upload to the <strong>goal text in step 1</strong>.
                    </>
                  ) : (
                    <>
                      Lines above come from this goal (Buddy) or generic examples. Local CLIP still scores your photo
                      against the <strong>goal text in step 1</strong>.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          <hr className="aivw-hr" />

          {/* Step 2 — Image upload */}
          <div>
            <p className="aivw-field-label">
              {imageData ? 'Step 2 — Your proof photo' : 'Step 2 — Upload your proof photo'}
            </p>

            {imageData ? (
              <div className="aivw-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageData} alt="Uploaded proof" className="aivw-img" />
                <button
                  className="aivw-img-rm"
                  onClick={() => setImageData(null)}
                  disabled={!active}
                  aria-label="Remove image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className={`aivw-drop${isDragging ? ' dragging' : ''}${!active ? ' off' : ''}`}
                onClick={() => active && fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                role="button"
                aria-label="Upload image"
              >
                <div className="aivw-drop-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" viewBox="0 0 24 24" stroke={isDragging ? '#7c3aed' : '#94a3b8'} strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#475569' }}>
                    Drop your image here, or{' '}
                    <span style={{ color: '#7c3aed', textDecoration: 'underline' }}>browse</span>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    JPG, PNG, WebP
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onFileInput}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Inline verify error */}
          {verifyErr && <div className="aivw-err-box">{verifyErr}</div>}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={!canVerify}
            className={`aivw-btn ${canVerify ? 'aivw-btn-on' : 'aivw-btn-off'}`}
          >
            {isVerifying ? (
              <>
                <div className="aivw-btn-spin" />
                Analyzing image…
              </>
            ) : trimmedGoal ? (
              `Verify "${trimmedGoal}"`
            ) : (
              'Verify Goal'
            )}
          </button>

          {!trimmedGoal && !imageData && active && (
            <p className="aivw-hint">Type your goal and upload a photo to get started</p>
          )}
        </div>
      )}
    </div>
  );
}
