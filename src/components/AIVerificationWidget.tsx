/**
 * AIVerificationWidget
 * ─────────────────────────────────────────────────────────────────────────────
 * Optional UI that asks the user for a goal + photo and verifies it via the
 * server-side OpenAI vision endpoint at `/api/verify`. No model downloads, no
 * local inference — the heavy lifting happens server-side.
 */

import React, {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { compressImage } from "@/lib/imageUtils";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface VerificationScore {
  label: string;
  score: number;
}

export interface VerificationResult {
  /** Whether the photo was judged to satisfy the goal. */
  verified: boolean;
  /** Confidence in [0, 1] — server returns 1 for verified / 0 for not. */
  confidence: number;
  /** Short human feedback from the model (mirrors `feedback` for legacy callers). */
  topLabel: string;
  goalName: string;
  /** Always empty for OpenAI; kept for API compatibility with older callers. */
  allScores: VerificationScore[];
  /** Sentence describing why the photo passed or failed. */
  feedback: string;
}

export interface AIVerificationWidgetProps {
  /** Fired whenever a verification attempt finishes. */
  onResult?: (result: VerificationResult) => void;
  /**
   * Pre-filled goal text (typically the goal you're submitting proof for).
   * If omitted the widget falls back to a free-text input.
   */
  goalTitle?: string;
  goalDescription?: string;
  proofRequirement?: string;
  className?: string;
  style?: CSSProperties;
}

const EXAMPLE_GOALS = [
  "cleaning my room",
  "going to the gym",
  "cooking a meal",
  "reading a book",
  "doing homework",
  "taking a walk outside",
  "meditating",
  "journaling",
];

// ─── Scoped CSS (injected once via <style id="aivw-styles">) ──────────────────

const CSS = `
.aivw*{box-sizing:border-box}
.aivw{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1e293b;width:100%}

.aivw-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:24px}
.aivw-field-label{display:block;font-size:15px;font-weight:600;color:#475569;margin:0 0 10px}

.aivw-input-wrap{position:relative}
.aivw-input{width:100%;border:2px solid #e2e8f0;border-radius:12px;padding:11px 38px 11px 14px;font-size:14px;color:#1e293b;background:#fff;outline:none;transition:border-color .15s;font-family:inherit}
.aivw-input::placeholder{color:#94a3b8}
.aivw-input:focus{border-color:#a78bfa}
.aivw-input.filled{border-color:#7c3aed}
.aivw-input:disabled{opacity:.55;cursor:not-allowed;background:#f8fafc}
.aivw-x{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;padding:4px;cursor:pointer;color:#94a3b8;line-height:0;border-radius:4px}
.aivw-x:hover{color:#64748b}
.aivw-x:disabled{opacity:.4;cursor:not-allowed}

.aivw-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.aivw-chip{padding:4px 12px;border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;font-size:12px;color:#64748b;cursor:pointer;transition:border-color .12s,background .12s,color .12s;font-family:inherit}
.aivw-chip:hover:not(:disabled){border-color:#c4b5fd;background:#f5f3ff;color:#7c3aed}
.aivw-chip:disabled{opacity:.45;cursor:not-allowed}

.aivw-hr{border:none;border-top:1px solid #f1f5f9;margin:0}

.aivw-drop{border:2px dashed #cbd5e1;border-radius:12px;padding:36px 16px;display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;transition:border-color .15s,background .15s;text-align:center;background:#fff}
.aivw-drop:hover,.aivw-drop.dragging{border-color:#a78bfa;background:#faf5ff}
.aivw-drop.off{opacity:.55;cursor:not-allowed;pointer-events:none}
.aivw-drop-icon{width:48px;height:48px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center}
.aivw-drop.dragging .aivw-drop-icon{background:#ede9fe}

.aivw-img-wrap{position:relative;border-radius:12px;overflow:hidden;border:2px solid #c4b5fd;background:#f8fafc}
.aivw-img{width:100%;max-height:240px;object-fit:contain;display:block}
.aivw-img-rm{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.92);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#475569;box-shadow:0 1px 4px rgba(0,0,0,.18)}
.aivw-img-rm:hover{background:#fff;color:#1e293b}
.aivw-img-rm:disabled{opacity:.4;cursor:not-allowed}

.aivw-btn{width:100%;padding:14px;border-radius:12px;border:none;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .15s,box-shadow .15s;font-family:inherit}
.aivw-btn-on{background:#7c3aed;color:#fff;box-shadow:0 2px 10px rgba(124,58,237,.3)}
.aivw-btn-on:hover{background:#6d28d9}
.aivw-btn-off{background:#f1f5f9;color:#94a3b8;cursor:not-allowed}
.aivw-btn-spin{width:15px;height:15px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:aivw-rotate .7s linear infinite;flex-shrink:0}
@keyframes aivw-rotate{to{transform:rotate(360deg)}}
.aivw-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

.aivw-hint{text-align:center;font-size:12px;color:#94a3b8}
.aivw-err-box{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;font-size:12px;color:#b91c1c}

.aivw-target{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:5px 11px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:999px;font-size:12px;color:#6d28d9}
.aivw-target-label{font-weight:500;color:#7c3aed}
.aivw-target-word{font-weight:700}

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
  goalTitle,
  goalDescription,
  proofRequirement,
  className = "",
  style,
}: AIVerificationWidgetProps) {
  const presetGoal = (goalTitle ?? "").trim();
  const [goalText, setGoalText] = useState(presetGoal);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inject scoped CSS once.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("aivw-styles")) return;
    const el = document.createElement("style");
    el.id = "aivw-styles";
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  // Keep `goalText` synced when the parent changes the preset goal.
  useEffect(() => {
    if (presetGoal) setGoalText(presetGoal);
  }, [presetGoal]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (typeof data === "string") {
        setImageData(data);
        setResult(null);
        setVerifyErr(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const handleVerify = async () => {
    const trimmed = goalText.trim();
    if (!trimmed || !imageData) return;

    setIsVerifying(true);
    setResult(null);
    setVerifyErr(null);

    try {
      // Compress before sending — OpenAI charges per pixel and big phone shots
      // dwarf the actual visual signal.
      const compressed = await compressImage(imageData, 1024, 0.78);
      const base64 = compressed.includes(",") ? compressed.split(",")[1] : compressed;

      const res = await fetch("/api/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          goalTitle: trimmed,
          goalDescription: goalDescription ?? "",
          proofRequirement: proofRequirement ?? "",
        }),
      });

      let data: { verified?: boolean; feedback?: string } = {};
      try {
        data = (await res.json()) as { verified?: boolean; feedback?: string };
      } catch {
        /* keep defaults */
      }

      if (!res.ok && !data.feedback) {
        setVerifyErr(
          res.status === 503
            ? "AI verification isn't configured (no OpenAI key on the server)."
            : `Verification service returned ${res.status}.`
        );
        return;
      }

      const verified = Boolean(data.verified);
      const feedback =
        data.feedback ?? (verified ? "Looks good." : "Couldn't confirm from this photo.");

      const res_obj: VerificationResult = {
        verified,
        confidence: verified ? 1 : 0,
        topLabel: feedback,
        goalName: trimmed,
        allScores: [],
        feedback,
      };

      setResult(res_obj);
      onResult?.(res_obj);
    } catch (err) {
      setVerifyErr(String(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setImageData(null);
    if (!presetGoal) setGoalText("");
    setVerifyErr(null);
  };

  const trimmedGoal = goalText.trim();
  const goalLocked = !!presetGoal;
  const canVerify = !!trimmedGoal && !!imageData && !isVerifying;
  const active = !isVerifying;

  return (
    <div className={`aivw ${className}`} style={style}>
      {result && (
        <div className={`aivw-res ${result.verified ? "aivw-res-ok" : "aivw-res-fail"}`}>
          <div className="aivw-res-top">
            <div
              className={`aivw-res-icon ${
                result.verified ? "aivw-res-icon-ok" : "aivw-res-icon-fail"
              }`}
            >
              {result.verified ? "✅" : "❌"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                className={`aivw-res-title ${
                  result.verified ? "aivw-res-title-ok" : "aivw-res-title-fail"
                }`}
              >
                {result.verified ? "Goal verified" : "Not verified"}
              </h3>
              <p
                className={`aivw-res-desc ${
                  result.verified ? "aivw-res-desc-ok" : "aivw-res-desc-fail"
                }`}
              >
                {result.feedback}
              </p>
            </div>
          </div>

          <div className="aivw-verdict-big">
            <p
              className={`aivw-verdict-big-title ${
                result.verified ? "aivw-verdict-big-title-ok" : "aivw-verdict-big-title-fail"
              }`}
            >
              {result.verified ? "YES" : "NO"}
            </p>
          </div>

          <button type="button" className="aivw-reset-btn" onClick={handleReset}>
            Try again
          </button>
        </div>
      )}

      {!result && (
        <div className="aivw-card">
          <div>
            <label htmlFor="aivw-goal-input" className="aivw-field-label">
              Step 1 — What&apos;s your goal?
            </label>
            <div className="aivw-input-wrap">
              <input
                id="aivw-goal-input"
                type="text"
                value={goalText}
                onChange={(e) => {
                  setGoalText(e.target.value);
                  setVerifyErr(null);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  void handleVerify();
                }}
                placeholder="e.g. cleaning my room, reading a book…"
                disabled={!active || goalLocked}
                maxLength={120}
                className={`aivw-input${trimmedGoal ? " filled" : ""}`}
              />
              {trimmedGoal && !goalLocked && (
                <button
                  className="aivw-x"
                  onClick={() => setGoalText("")}
                  disabled={!active}
                  aria-label="Clear goal"
                  type="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>

            {!trimmedGoal && !goalLocked && (
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

            {trimmedGoal && (
              <div className="aivw-target">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                <span className="aivw-target-label">Verifying:</span>
                <span className="aivw-target-word">{trimmedGoal}</span>
              </div>
            )}
          </div>

          <hr className="aivw-hr" />

          <div>
            <p className="aivw-field-label">
              {imageData ? "Step 2 — Your proof photo" : "Step 2 — Upload your proof photo"}
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className={`aivw-drop${isDragging ? " dragging" : ""}${
                  !active ? " off" : ""
                }`}
                onClick={() => active && fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                role="button"
                aria-label="Upload image"
              >
                <div className="aivw-drop-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="26"
                    height="26"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke={isDragging ? "#7c3aed" : "#94a3b8"}
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#475569" }}>
                    Drop your image here, or{" "}
                    <span style={{ color: "#7c3aed", textDecoration: "underline" }}>browse</span>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                    JPG, PNG, WebP
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onFileInput}
                  style={{ display: "none" }}
                />
              </div>
            )}
          </div>

          {verifyErr && <div className="aivw-err-box">{verifyErr}</div>}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              void handleVerify();
            }}
            disabled={!canVerify}
            className={`aivw-btn ${canVerify ? "aivw-btn-on" : "aivw-btn-off"}`}
          >
            {isVerifying ? (
              <>
                <span className="aivw-sr-only">Verifying</span>
                <div className="aivw-btn-spin" aria-hidden="true" />
              </>
            ) : trimmedGoal ? (
              `Verify "${trimmedGoal}"`
            ) : (
              "Verify Goal"
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
