"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, CheckCircle2, XCircle, Loader2, ArrowLeft, SwitchCamera, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useHideHeader } from "@/context/HideHeaderContext";
import { LoadingView } from "@/components/LoadingView";
import { isWithinSubmissionWindow, getSubmissionWindowMessage } from "@/lib/goalDue";
import { compressImage, uploadProofToStorage } from "@/lib/imageUtils";
import { lightImpact } from "@/lib/haptics";
import { format } from "date-fns";
import { generateId } from "@/lib/store";
import type { StoredUser } from "@/lib/store";
import type { Goal } from "@/types";
import { DEFAULT_CLIP_VERIFY_THRESHOLD } from "@/lib/clipVerifyConstants";
import { verificationTextFromGoal } from "@/lib/goalVerificationText";
import type { VerificationResult } from "@/components/AIVerificationWidget";

const AIVerificationWidget = dynamic(() => import("@/components/AIVerificationWidget"), {
  ssr: false,
  loading: () => (
    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading local AI verifier…</p>
  ),
});

function SubmitProofContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const goalId = searchParams.get("goalId");
  const {
    user: contextUser,
    goals: contextGoals,
    addSubmission,
    updateSubmission,
    updateGoal,
    useSupabase,
    supabase,
    authReady,
    getSubmissionsForGoal,
  } = useApp();
  // Fallback: fetch directly when context doesn't have data (handles direct nav / context race)
  const [localUser, setLocalUser] = useState<StoredUser | null>(null);
  const [localGoal, setLocalGoal] = useState<Goal | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const user = contextUser ?? localUser;
  const goal = contextGoals.find((g) => g.id === goalId) ?? localGoal ?? null;
  const goals = goal && !contextGoals.find((g) => g.id === goal.id) ? [...contextGoals, goal] : contextGoals;

  useEffect(() => {
    if (!goalId || !authReady) return;
    if (user && goal) {
      setPageLoading(false);
      return;
    }
    // Need to fetch - prevent redirect until we have data
    setPageLoading(true);
    let cancelled = false;
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
    ]).then(([profileRes, goalsRes]) => {
      if (cancelled) return;
      const p = profileRes?.profile;
      if (p) setLocalUser({ id: p.id, email: p.email, plan: p.plan ?? "free", createdAt: p.createdAt ?? new Date().toISOString() });
      const gs = goalsRes?.goals ?? [];
      const g = gs.find((x: Goal) => x.id === goalId);
      if (g) setLocalGoal(g);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setPageLoading(false);
    });
    return () => { cancelled = true; };
  }, [goalId, authReady, contextUser, contextGoals, localUser, localGoal]);

  const [step, setStep] = useState<"capture" | "uploading" | "result">("capture");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [verified, setVerified] = useState<boolean | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoStartCameraAttemptedRef = useRef(false);
  const aiWidgetMountRef = useRef<HTMLDivElement>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const hasRedirected = useRef(false);
  const hasShownContent = useRef(false);

  // Once we've shown the submit UI (camera), never redirect - avoids auth blips
  useEffect(() => {
    if (user && goal) hasShownContent.current = true;
  }, [user, goal]);

  const goalSubs = goal ? getSubmissionsForGoal(goal.id) : [];
  const inWindow = !!goal && isWithinSubmissionWindow(goal, new Date(), goalSubs);

  const [, setHideHeader] = useHideHeader();
  const hideHeaderForCamera =
    (step === "capture" &&
      (cameraStarted || (!cameraStarted && !cameraError && !!goal && inWindow))) ||
    step === "uploading" ||
    step === "result";
  useEffect(() => {
    setHideHeader(hideHeaderForCamera);
    return () => setHideHeader(false);
  }, [hideHeaderForCamera, setHideHeader]);

  useEffect(() => {
    if (!authReady || hasRedirected.current || pageLoading) return;
    if (hasShownContent.current) return; // Already showed content - don't redirect
    if (!goalId) {
      hasRedirected.current = true;
      router.replace("/buddy");
      return;
    }
    if (!user) {
      hasRedirected.current = true;
      router.replace("/dashboard");
      return;
    }
    if (!goal) {
      hasRedirected.current = true;
      router.replace("/buddy");
      return;
    }
  }, [authReady, user, goalId, goal, router, pageLoading]);

  const stopCamera = useCallback((keepCameraMode = false) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreamReady(false);
    if (!keepCameraMode) setCameraStarted(false);
  }, []);

  const exitCameraToDashboard = useCallback(() => {
    stopCamera();
    setCameraStarted(false);
    router.push("/dashboard");
  }, [stopCamera, router]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleStartCamera = useCallback(async (preferredFacing?: "user" | "environment") => {
    if (typeof window === "undefined") return;

    const isLocalhost =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isSecure = window.isSecureContext;

    if (!isSecure && !isLocalhost) {
      setCameraError(
        "Camera access requires HTTPS. Open this app over a secure connection to use the camera."
      );
      return;
    }

    const targetFacing = preferredFacing ?? facingMode;

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: targetFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
      };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      setFacingMode(targetFacing);
      setCameraError(null);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // Some browsers require play() in user gesture; autoPlay may handle it
        }
      }
      setStreamReady(true);
      setCameraStarted(true);
    } catch (e) {
      console.error(e);
      setCameraError("Could not access camera. Check permissions and try again.");
    }
  }, [facingMode]);

  const flipCamera = useCallback(() => {
    const next = facingMode === "user" ? "environment" : "user";
    stopCamera(true);
    handleStartCamera(next);
  }, [facingMode, stopCamera, handleStartCamera]);

  // Attach stream to video when both exist (handles timing when video mounts after stream)
  useEffect(() => {
    if (step !== "capture" || !streamRef.current || !videoRef.current || !streamReady) return;
    const video = videoRef.current;
    if (!video.srcObject && streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }
  }, [step, streamReady]);

  useEffect(() => {
    if (!user || !goal) return;
    if (!inWindow) return;
    if (step !== "capture" || cameraStarted) return;
    if (autoStartCameraAttemptedRef.current) return;
    autoStartCameraAttemptedRef.current = true;
    void handleStartCamera();
  }, [user, goal, inWindow, step, cameraStarted, handleStartCamera]);

  // If camera is "opening" for too long, show retry option
  const isStartingCamera =
    step === "capture" && !cameraStarted && !cameraError && !!goal && inWindow;
  useEffect(() => {
    if (!isStartingCamera) return;
    const t = setTimeout(() => {
      setCameraError("Camera didn’t open. Tap to try again.");
    }, 8000);
    return () => clearTimeout(t);
  }, [isStartingCamera]);

  const persistCompressedProof = useCallback(
    async (compressed: string, clipSummary: string, aiPassed: boolean) => {
      if (!goal || !user) return;
      let imageToStore = compressed;
      const submissionId = generateId();
      const base64 = compressed.split(",")[1];
      if (!base64) {
        setVerified(false);
        setStep("result");
        return;
      }

      if (useSupabase && supabase) {
        try {
          const storageUrl = await uploadProofToStorage(supabase, user.id, submissionId, compressed);
          imageToStore = storageUrl;
        } catch {
          setVerified(false);
          setStep("result");
          return;
        }
      } else {
        imageToStore = compressed;
      }

      try {
        const now = new Date();
        const subsNow = getSubmissionsForGoal(goal.id);
        const withinWindow = isWithinSubmissionWindow(goal, now, subsNow);
        const passed = aiPassed && withinWindow;
        const msg = withinWindow ? clipSummary : "Submissions are closed right now.";

        const sub = await addSubmission({
          goalId: goal.id,
          date: todayStr,
          imageDataUrl: imageToStore,
          status: passed ? "verified" : "rejected",
          aiFeedback: msg,
          verifiedAt: passed ? new Date().toISOString() : undefined,
        });
        setVerified(passed);
        await updateSubmission(sub.id, {
          status: passed ? "verified" : "rejected",
          aiFeedback: msg,
          verifiedAt: passed ? new Date().toISOString() : undefined,
        });
        if (passed) {
          const g = goals.find((x: Goal) => x.id === goal.id);
          if (g && !g.completedDates.includes(todayStr)) {
            await updateGoal(goal.id, {
              completedDates: [...g.completedDates, todayStr],
            });
          }
        }
      } catch {
        setVerified(false);
      } finally {
        setStep("result");
      }
    },
    [
      goal,
      todayStr,
      user,
      addSubmission,
      updateSubmission,
      updateGoal,
      goals,
      useSupabase,
      supabase,
      getSubmissionsForGoal,
    ]
  );

  const runProofVerification = useCallback(
    async (sourceDataUrl: string) => {
      if (!goal || !user) return;
      lightImpact();
      setStep("uploading");
      const imageToStore = sourceDataUrl;

      try {
        const compressed = await compressImage(sourceDataUrl, 1200, 0.75);
        const verifyGoalText = verificationTextFromGoal(goal);
        const { verifyWithLocalClip, formatLocalClipUserFeedback } = await import(
          "@/lib/localClipVerify"
        );
        const clip = await verifyWithLocalClip({
          imageDataUrl: compressed,
          goalText: verifyGoalText,
          threshold: DEFAULT_CLIP_VERIFY_THRESHOLD,
        });
        const { summaryLine: clipSummary } = formatLocalClipUserFeedback(
          clip,
          DEFAULT_CLIP_VERIFY_THRESHOLD
        );
        await persistCompressedProof(compressed, clipSummary, clip.verified);
      } catch {
        setVerified(false);
        try {
          const sub = await addSubmission({
            goalId: goal.id,
            date: todayStr,
            imageDataUrl: imageToStore,
            status: "rejected",
            aiFeedback: "Request failed.",
          });
        } catch {
          /* keep denied state */
        }
        setStep("result");
      }
    },
    [goal, user, todayStr, addSubmission, persistCompressedProof]
  );

  const handleAiWidgetResult = useCallback(
    (result: VerificationResult) => {
      if (!goal || !user) return;
      const proofUrl =
        aiWidgetMountRef.current?.querySelector<HTMLImageElement>("img.aivw-img")?.src ?? null;
      if (!proofUrl?.startsWith("data:")) {
        if (typeof window !== "undefined") {
          window.alert(
            "Could not read the photo from the widget. Try verifying again, or use the camera below."
          );
        }
        return;
      }
      lightImpact();
      setStep("uploading");
      void (async () => {
        try {
          const compressed = await compressImage(proofUrl, 1200, 0.75);
          const { formatLocalClipUserFeedback } = await import("@/lib/localClipVerify");
          const { summaryLine } = formatLocalClipUserFeedback(
            { verified: result.verified, confidence: result.confidence },
            DEFAULT_CLIP_VERIFY_THRESHOLD
          );
          await persistCompressedProof(compressed, summaryLine, result.verified);
        } catch {
          setVerified(false);
          setStep("result");
        }
      })();
    },
    [goal, user, persistCompressedProof]
  );

  const handleCloseApp = useCallback(() => {
    if (typeof window === "undefined") return;
    window.close();
    window.setTimeout(() => {
      router.push("/dashboard");
    }, 200);
  }, [router]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0);
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();
    void runProofVerification(dataUrl);
  }, [facingMode, stopCamera, runProofVerification]);

  if (!authReady || pageLoading || !user || !goal) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <LoadingView />
      </main>
    );
  }

  // After a verified check-in, `inWindow` becomes false (already proved today). Still show upload/result UI
  // so the user sees verified vs denied — only block the capture flow when the window was closed on arrival.
  if (!inWindow && step === "capture") {
    const msg = getSubmissionWindowMessage(goal, new Date(), goalSubs);
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
          <Link
            href="/buddy"
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to garden
          </Link>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {goal.title}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {msg ?? "Submissions are closed right now."}
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block text-sm font-medium text-prove-600 hover:text-prove-700 dark:text-prove-400"
            >
              Back to dashboard
            </Link>
          </div>
        </main>
    );
  }

  const showFullScreenCamera = step === "capture" && cameraStarted;
  const showStartingCamera =
    step === "capture" && !cameraStarted && !cameraError && inWindow;
  const showCameraRetry =
    step === "capture" && !showFullScreenCamera && !cameraStarted && !!cameraError;

  return (
    <>
      {step === "result" && verified !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
          <div
            className={`w-full max-w-sm rounded-2xl border-2 p-8 text-center shadow-xl ${
              verified
                ? "border-emerald-400/80 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/90"
                : "border-red-400/80 bg-red-50 dark:border-red-700 dark:bg-red-950/90"
            }`}
          >
            {verified ? (
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="mx-auto h-14 w-14 text-red-600 dark:text-red-400" />
            )}
            <h2 className="mt-5 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {verified ? "Approved" : "Denied"}
            </h2>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl bg-prove-600 py-3.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-prove-700"
              >
                Go to dashboard
              </Link>
              <button
                type="button"
                onClick={handleCloseApp}
                className="rounded-xl border-2 border-slate-300 bg-white py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Close app
              </button>
            </div>
          </div>
        </div>
      )}

      {step !== "result" && (
      <main className="mx-auto max-w-lg px-4 py-8">
        {!showFullScreenCamera && !showStartingCamera && (
          <Link
            href="/buddy"
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to garden
          </Link>
        )}

        {!showFullScreenCamera && !showStartingCamera && (
          <>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Prove it: {goal.title}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Use the camera below for a quick check-in, or try the optional local AI box first — type your goal,
              upload a photo, and verify (same CLIP model as the camera). One check-in per calendar day (Sun–Sat week
              for weekly targets). The X on the camera exits to your dashboard.
            </p>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Local AI (optional)</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                When verification finishes here, your proof is saved like the camera flow.
              </p>
              <div className="mt-3" ref={aiWidgetMountRef}>
                <AIVerificationWidget
                  key={goal.id}
                  threshold={DEFAULT_CLIP_VERIFY_THRESHOLD}
                  onResult={(r) => {
                    void handleAiWidgetResult(r);
                  }}
                />
              </div>
            </div>
          </>
        )}

        {showStartingCamera && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
            <p className="mt-4 text-sm text-white">Opening camera…</p>
          </div>
        )}

        {showCameraRetry && (
          <div className="mt-8 animate-fade-in">
            <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
              {cameraError}
            </p>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
                <p className="text-center text-sm text-slate-300">
                  Tap to start camera
                </p>
                <button
                  onClick={() => {
                    setCameraError(null);
                    handleStartCamera();
                  }}
                  className="glass-overlay-bar-btn-primary flex items-center gap-2 rounded-xl px-5 py-3 text-white hover:bg-prove-500/45"
                >
                  <Camera className="h-6 w-6" />
                  Use camera
                </button>
              </div>
            </div>
          </div>
        )}

        {showFullScreenCamera && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                transform: facingMode === "user" ? "scaleX(-1)" : undefined,
              }}
            />
            {!streamReady && (
              <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 rounded-lg bg-black/50 px-4 py-3">
                <p className="text-sm text-white">Starting camera…</p>
              </div>
            )}
            <button
              type="button"
              onClick={exitCameraToDashboard}
              className="absolute left-4 top-[env(safe-area-inset-top,1rem)] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              aria-label="Close camera and go to dashboard"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
              <button
                onClick={flipCamera}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                aria-label="Switch camera"
              >
                <SwitchCamera className="h-7 w-7" />
              </button>
              <button
                onClick={capturePhoto}
                className="glass-overlay-bar-btn-primary flex h-16 w-16 items-center justify-center rounded-full text-white hover:bg-prove-500/45"
                aria-label="Take photo"
              >
                <Camera className="h-8 w-8" />
              </button>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black px-6">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
            <p className="mt-4 text-center text-sm font-medium text-white">
              Verifying on your device…
            </p>
            <p className="mt-2 max-w-sm text-center text-xs text-white/70">
              Running local CLIP on your photo (first visit may download the model).
            </p>
          </div>
        )}
      </main>
      )}
    </>
  );
}

export default function SubmitProofPage() {
  return <SubmitProofContent />;
}
