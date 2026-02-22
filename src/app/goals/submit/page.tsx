"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Upload, CheckCircle2, XCircle, Loader2, ArrowLeft, SwitchCamera, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";
import { isWithinSubmissionWindow, getSubmissionWindowMessage } from "@/lib/goalDue";
import { compressImage, uploadProofToStorage } from "@/lib/imageUtils";
import { format } from "date-fns";
import { generateId } from "@/lib/store";
import type { StoredUser } from "@/lib/store";
import type { Goal } from "@/types";

function SubmitProofContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const goalId = searchParams.get("goalId");
  const { user: contextUser, goals: contextGoals, addSubmission, updateSubmission, updateGoal, useSupabase, supabase, authReady } = useApp();
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
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoStartCameraAttemptedRef = useRef(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const hasRedirected = useRef(false);
  const hasShownContent = useRef(false);

  // Once we've shown the submit UI (camera/upload), never redirect - avoids auth blips
  useEffect(() => {
    if (user && goal) hasShownContent.current = true;
  }, [user, goal]);

  const inWindow = !!goal && isWithinSubmissionWindow(goal);

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
        "Camera access is blocked because this page is not running on HTTPS. Use Upload photo instead."
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
      setCameraError("Could not access camera. You can upload a photo instead.");
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
    if (step !== "capture" || cameraStarted || imageDataUrl) return;
    if (autoStartCameraAttemptedRef.current) return;
    autoStartCameraAttemptedRef.current = true;
    void handleStartCamera();
  }, [user, goal, inWindow, step, cameraStarted, imageDataUrl, handleStartCamera]);

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
    setImageDataUrl(dataUrl);
    stopCamera();
  }, [facingMode, stopCamera]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      setCameraError(null);
      stopCamera();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submitForVerification = useCallback(async () => {
    if (!imageDataUrl || !goal || !user) return;
    setStep("uploading");

    let imageToStore = imageDataUrl;
    const submissionId = generateId();

    try {
      // Compress image to avoid API body size limits
      const compressed = await compressImage(imageDataUrl, 1200, 0.75);
      const base64 = compressed.split(",")[1];
      if (!base64) {
        setVerified(false);
        setFeedback("Invalid image.");
        setStep("result");
        return;
      }

      // If using Supabase, upload to Storage and use URL instead of base64
      if (useSupabase && supabase) {
        try {
          const storageUrl = await uploadProofToStorage(supabase, user.id, submissionId, compressed);
          imageToStore = storageUrl;
        } catch (uploadErr) {
          setVerified(false);
          setFeedback("Failed to upload image. Please try again.");
          setStep("result");
          return;
        }
      } else {
        imageToStore = compressed;
      }

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          goalTitle: goal.title,
          goalDescription: goal.description ?? "",
        }),
      });
      const data = await res.json();
      const aiPassed = data.verified === true;
      const now = new Date();
      const withinWindow = isWithinSubmissionWindow(goal, now);

      const passed = aiPassed && withinWindow;
      const msg = withinWindow
        ? data.feedback ?? "Verification completed."
        : "Submissions are closed right now.";

      const sub = await addSubmission({
        goalId: goal.id,
        date: todayStr,
        imageDataUrl: imageToStore,
        status: passed ? "verified" : "rejected",
        aiFeedback: msg,
        verifiedAt: passed ? new Date().toISOString() : undefined,
      });
      setSubmissionId(sub.id);
      setVerified(passed);
      setFeedback(msg);
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
    } catch (err) {
      setVerified(false);
      setFeedback("Something went wrong. Please try again.");
      try {
        const sub = await addSubmission({
          goalId: goal.id,
          date: todayStr,
          imageDataUrl: imageToStore,
          status: "rejected",
          aiFeedback: "Request failed.",
        });
        setSubmissionId(sub.id);
      } catch {
        setFeedback("Failed to save submission. Please try again.");
      }
    }
    setStep("result");
  }, [imageDataUrl, goal, todayStr, user, addSubmission, updateSubmission, updateGoal, goals, useSupabase, supabase]);

  if (!authReady || pageLoading || !user || !goal) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-slate-600 dark:text-slate-400">Loading…</p>
        </main>
      </>
    );
  }

  if (!inWindow) {
    const msg = getSubmissionWindowMessage(goal);
    return (
      <>
        <Header />
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
      </>
    );
  }

  const showFullScreenCamera = step === "capture" && cameraStarted && !imageDataUrl;
  const showStartingCamera =
    step === "capture" && !cameraStarted && !imageDataUrl && !cameraError && inWindow;
  const showCameraOrUploadChoice =
    step === "capture" && !showFullScreenCamera && !cameraStarted && !!cameraError;

  return (
    <>
      {!showFullScreenCamera && !showStartingCamera && <Header />}
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
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Take a photo or upload one showing you doing this goal. AI will verify it. You can submit any time before the due deadline.
            </p>
          </>
        )}

        {showStartingCamera && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
            <p className="mt-4 text-sm text-white">Opening camera…</p>
          </div>
        )}

        {showCameraOrUploadChoice && (
          <div className="mt-8 animate-fade-in">
            <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
              {cameraError}
            </p>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
                <p className="text-center text-sm text-slate-300">
                  Tap to start camera or upload a photo
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setCameraError(null);
                      handleStartCamera();
                    }}
                    className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-slate-900 shadow-lg hover:bg-slate-100"
                  >
                    <Camera className="h-6 w-6" />
                    Use camera
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-500 bg-slate-800 px-5 py-3 text-white hover:bg-slate-700">
                    <Upload className="h-6 w-6" />
                    Upload photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
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
              onClick={() => {
                stopCamera();
                setCameraStarted(false);
              }}
              className="absolute left-4 top-[env(safe-area-inset-top,1rem)] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              aria-label="Close camera"
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
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg hover:bg-slate-100"
                aria-label="Take photo"
              >
                <Camera className="h-8 w-8" />
              </button>
              <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                <Upload className="h-7 w-7" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {step === "capture" && !showFullScreenCamera && imageDataUrl && (
          <div className="mt-8 animate-fade-in">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
              <div className="flex h-full flex-col items-center justify-center p-4">
                <img
                  src={imageDataUrl}
                  alt="Your proof"
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setImageDataUrl(null);
                      setCameraStarted(true);
                      handleStartCamera();
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300"
                  >
                    Retake
                  </button>
                  <button
                    onClick={submitForVerification}
                    className="rounded-lg bg-prove-600 px-4 py-2 text-sm font-medium text-white hover:bg-prove-700"
                  >
                    Prove it
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-12 w-12 animate-spin text-prove-600" />
            <p className="mt-4 font-medium text-slate-900 dark:text-white">
              Verifying with AI…
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Checking that your photo matches your goal.
            </p>
          </div>
        )}

        {step === "result" && (
          <div className="mt-8 animate-fade-in">
            <div
              className={`rounded-2xl border p-8 ${
                verified
                  ? "border-prove-200 bg-prove-50 dark:border-prove-800 dark:bg-prove-950/30"
                  : "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20"
              }`}
            >
              {verified ? (
                <CheckCircle2 className="h-16 w-16 text-prove-600 dark:text-prove-400" />
              ) : (
                <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
              )}
              <h2 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">
                {verified ? "Verified!" : "Not verified"}
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400">{feedback}</p>
            </div>
            <div className="mt-6 flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 rounded-lg bg-prove-600 py-3 text-center font-medium text-white hover:bg-prove-700"
              >
                Back to dashboard
              </Link>
              <Link
                href="/buddy"
                className="flex-1 rounded-lg border border-slate-300 py-3 text-center font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Goal Garden
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function SubmitProofPage() {
  return <SubmitProofContent />;
}
