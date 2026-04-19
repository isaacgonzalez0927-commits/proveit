/**
 * AIVerificationWidget
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in React component for AI-powered goal verification.
 * Uses CLIP via Transformers.js — 100% local, zero external API calls.
 *
 * ─── Peer dependency ────────────────────────────────────────────────────────
 *   npm install @huggingface/transformers
 *
 * ─── Usage ──────────────────────────────────────────────────────────────────
 *   import AIVerificationWidget from './AIVerificationWidget';
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
} from 'react';
import { evaluateClipLabelScores, makeLabels } from '@/lib/clipVerifyLabels';
import { compressImage } from '@/lib/imageUtils';
import { getSharedClipPipeline, type ClipLoadProgress } from '@/lib/localClipVerify';
import {
  DEFAULT_CLIP_MODEL_ID,
  WIDGET_CLIP_MAIN_WORD_FLOOR,
  WIDGET_CLIP_VERIFY_MARGIN,
  WIDGET_CLIP_VERIFY_THRESHOLD,
} from '@/lib/clipVerifyConstants';

// ─── Public types ─────────────────────────────────────────────────────────────

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
}

export interface AIVerificationWidgetProps {
  /** Fired whenever a verification attempt finishes */
  onResult?: (result: VerificationResult) => void;
  /**
   * Minimum softmax score (0–1) on the winning label when that label matches the goal
   * (default: `WIDGET_CLIP_VERIFY_THRESHOLD` — relaxed vs camera submit).
   */
  threshold?: number;
  /** Minimum margin of top label over best negative (default `WIDGET_CLIP_VERIFY_MARGIN`). */
  margin?: number;
  /** Main-word softmax sum floor when main-word labels exist (default `WIDGET_CLIP_MAIN_WORD_FLOOR`). */
  mainWordFloor?: number;
  /**
   * Any HuggingFace zero-shot-image-classification model ID.
   * @default 'Xenova/clip-vit-base-patch32'
   */
  modelId?: string;
  /** Extra class name applied to the widget's root element */
  className?: string;
  /** Extra inline styles applied to the widget's root element */
  style?: CSSProperties;
}

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
.aivw-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* ── hint ── */
.aivw-hint{text-align:center;font-size:12px;color:#94a3b8}

/* ── error box ── */
.aivw-err-box{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;font-size:12px;color:#b91c1c}

/* ── model error banner ── */
.aivw-model-err{background:#fef2f2;border:2px solid #fecaca;border-radius:16px;padding:22px;text-align:center}
.aivw-reload-btn{margin-top:12px;padding:8px 18px;font-size:13px;font-weight:500;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit}
.aivw-reload-btn:hover{background:#b91c1c}

/* ── "Looking for: X" pill under goal input ── */
.aivw-target{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:5px 11px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:999px;font-size:12px;color:#6d28d9}
.aivw-target-label{font-weight:500;color:#7c3aed}
.aivw-target-word{font-weight:700}

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
.aivw-verdict-big{text-align:center;margin-top:8px}
.aivw-verdict-big-title{font-size:36px;font-weight:800;letter-spacing:.03em;margin:0;line-height:1}
.aivw-verdict-big-title-ok{color:#065f46}
.aivw-verdict-big-title-fail{color:#7f1d1d}
.aivw-reset-btn{width:100%;margin-top:16px;padding:10px 16px;border-radius:10px;background:#fff;border:1px solid #e2e8f0;font-size:13px;font-weight:500;color:#475569;cursor:pointer;transition:background .12s,border-color .12s;font-family:inherit}
.aivw-reset-btn:hover{background:#f8fafc;border-color:#cbd5e1}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIVerificationWidget({
  onResult,
  threshold = WIDGET_CLIP_VERIFY_THRESHOLD,
  margin = WIDGET_CLIP_VERIFY_MARGIN,
  mainWordFloor = WIDGET_CLIP_MAIN_WORD_FLOOR,
  modelId = DEFAULT_CLIP_MODEL_ID,
  className = '',
  style,
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

  const pipelineRef = useRef<((image: string, labels: string[]) => Promise<VerificationScore[]>) | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = modelStatus === 'ready' && !isVerifying;

  // ── Inject scoped CSS once ───────────────────────────────────────────────
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('aivw-styles')) return;
    const el = document.createElement('style');
    el.id = 'aivw-styles';
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  // ── Load CLIP (shared singleton with camera `verifyWithLocalClip`) ──
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const onProgress = (p: ClipLoadProgress) => {
          if (cancelled) return;
          if (p.status === 'progress' && p.progress != null) {
            setLoadPct(Math.min(99, p.progress));
            setLoadFile(p.file ?? '');
          }
        };
        const runner = await getSharedClipPipeline(modelId, onProgress);
        if (cancelled) return;
        pipelineRef.current = runner;
        setLoadPct(100);
        setModelStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setModelStatus('error');
          setModelErr(String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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
    if (!trimmed || !imageData || !pipelineRef.current) return;

    setIsVerifying(true);
    setResult(null);
    setVerifyErr(null);

    try {
      const { all: labels, positive: positiveLabels, mainWordLabels } = makeLabels(trimmed);
      const imageForClip = await compressImage(imageData, 384, 0.82);
      const raw: VerificationScore[] = await pipelineRef.current(imageForClip, labels);
      const { verified, confidence, topLabel, sorted } = evaluateClipLabelScores(
        raw,
        positiveLabels,
        threshold,
        {
          margin,
          mainWordLabels,
          mainWordFloor,
        }
      );

      const res: VerificationResult = {
        verified,
        confidence,
        topLabel,
        goalName: trimmed,
        allScores: sorted,
      };

      setResult(res);
      onResult?.(res);
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
  };

  const trimmedGoal = goalText.trim();
  const mainWord = useMemo(() => {
    if (!trimmedGoal) return null;
    return makeLabels(trimmedGoal).mainWord;
  }, [trimmedGoal]);
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
          <button type="button" className="aivw-reload-btn" onClick={() => window.location.reload()}>
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
                {result.verified ? 'Goal verified' : 'Not verified'}
              </h3>
              <p className={`aivw-res-desc ${result.verified ? 'aivw-res-desc-ok' : 'aivw-res-desc-fail'}`}>
                {result.verified
                  ? `Verified for "${result.goalName}" — this image counts as proof.`
                  : `Not verified for "${result.goalName}". Take another photo that clearly shows what you did.`}
              </p>
            </div>
          </div>

          <div className="aivw-verdict-big">
            <p className={`aivw-verdict-big-title ${result.verified ? 'aivw-verdict-big-title-ok' : 'aivw-verdict-big-title-fail'}`}>
              {result.verified ? 'YES' : 'NO'}
            </p>
          </div>

          <button type="button" className="aivw-reset-btn" onClick={handleReset}>
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
              Step 1 — What's your goal?
            </label>
            <div className="aivw-input-wrap">
              <input
                id="aivw-goal-input"
                type="text"
                value={goalText}
                onChange={(e) => { setGoalText(e.target.value); setVerifyErr(null); }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  void handleVerify();
                }}
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
                    type="button"
                    className="aivw-chip"
                    onClick={() => setGoalText(eg)}
                    disabled={!active}
                  >
                    {eg}
                  </button>
                ))}
              </div>
            )}

            {trimmedGoal && mainWord && (
              <div className="aivw-target">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                <span className="aivw-target-label">Looking for:</span>
                <span className="aivw-target-word">{mainWord}</span>
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
                <img src={imageData} alt="Uploaded proof" className="aivw-img" />
                <button
                  type="button"
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
            type="button"
            onClick={(e) => {
              e.preventDefault();
              void handleVerify();
            }}
            disabled={!canVerify}
            className={`aivw-btn ${canVerify ? 'aivw-btn-on' : 'aivw-btn-off'}`}
          >
            {isVerifying ? (
              <>
                <span className="aivw-sr-only">Verifying</span>
                <div className="aivw-btn-spin" aria-hidden="true" />
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
