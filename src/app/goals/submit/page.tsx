"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, CheckCircle2, XCircle, Loader2, ArrowLeft, SwitchCamera, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useHideHeader } from "@/context/HideHeaderContext";
import { LoadingView } from "@/components/LoadingView";
import {
  isWithinSubmissionWindow,
  getSubmissionWindowMessage,
  hasVerifiedSubmissionOnDate,
} from "@/lib/goalDue";
import { compressImage, uploadProofToStorage } from "@/lib/imageUtils";
import { lightImpact, success as hapticSuccess } from "@/lib/haptics";
import { getGoalStreak } from "@/lib/goalProgress";
import { getPlantStageForStreak } from "@/lib/plantGrowth";
import { setGardenProofFlash } from "@/lib/gardenProofFlash";
import { completeGardenRecovery, setGardenersNote } from "@/lib/gardenMeta";
import { completeWelcomeWeekIfNeeded } from "@/lib/welcomeWeek";
import { PlantWateringCelebration } from "@/components/PlantWateringCelebration";
import { PlantIllustration } from "@/components/PlantIllustration";
import { getWeeklyPlantState } from "@/lib/plantState";
import { format } from "date-fns";
import { generateId } from "@/lib/store";
import type { StoredUser } from "@/lib/store";
import type { Goal } from "@/types";
import type { VerificationResult } from "@/components/AIVerificationWidget";
import { getAiCoachRemaining, aiCoachUsageSummary } from "@/lib/aiCoachUsage";

async function verifyWithOpenAI(args: {
  imageDataUrl: string;
  goalTitle: string;
  goalDescription?: string;
  proofRequirement?: string;
}): Promise<{
  verified: boolean;
  feedback: string;
  aiCoach?: { used: number; remaining: number; limit: number; weekKey: string };
  limitReached?: boolean;
}> {
  const base64 = args.imageDataUrl.includes(",")
    ? args.imageDataUrl.split(",")[1]
    : args.imageDataUrl;
  const res = await fetch("/api/verify", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: base64,
      goalTitle: args.goalTitle,
      goalDescription: args.goalDescription ?? "",
      proofRequirement: args.proofRequirement ?? "",
    }),
  });
  let data: {
    verified?: boolean;
    feedback?: string;
    code?: string;
    aiCoach?: { used: number; remaining: number; limit: number; weekKey: string };
  } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    /* keep defaults */
  }
  if (res.status === 429 || data.code === "AI_COACH_LIMIT") {
    return {
      verified: false,
      feedback:
        data.feedback ??
        "AI Coach weekly limit reached. Upgrade or wait until Monday 00:00 UTC.",
      aiCoach: data.aiCoach,
      limitReached: true,
    };
  }
  if (!res.ok && !data.feedback) {
    return {
      verified: false,
      feedback:
        res.status === 503
          ? "AI verification isn't configured yet. Add an OpenAI key on the server."
          : "Verification service is unavailable. Try again in a moment.",
      aiCoach: data.aiCoach,
    };
  }
  return {
    verified: Boolean(data.verified),
    feedback: data.feedback ?? (data.verified ? "Verified." : "Not verified."),
    aiCoach: data.aiCoach,
  };
}

function verificationImageMaxSide(plan: string | undefined): number {
  return plan === "pro" || plan === "premium" ? 1200 : 512;
}

const AIVerificationWidget = dynamic(() => import("@/components/AIVerificationWidget"), {
  ssr: false,
  loading: () => (
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading fresh-photo verifier...</p>
  ),
});

function submitCameraGateKey(goalId: string) {
  return `proveit_submit_camera_gate_${goalId}`;
}

function firstProofSeenStorageKey(userId: string) {
  return `proveit_first_proof_seen_${userId}`;
}

function ProofFlowOverlay({ children }: { children: ReactNode }) {
  return <div className="proof-flow-overlay">{children}</div>;
}

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
    submissions,
    graceDayEvents,
    getGoalPlantVariant,
  } = useApp();
  // Fallback: fetch directly when context doesn't have data (handles direct nav / context race)
  const [localUser, setLocalUser] = useState<StoredUser | null>(null);
  const [localGoal, setLocalGoal] = useState<Goal | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [coachUsage, setCoachUsage] = useState<{
    used: number;
    remaining: number;
    limit: number;
  } | null>(null);
  /** Avoid full-page loading flashes when context refetches goals/user mid proof (same as sticky session in AppContext). */
  const stickyUserRef = useRef<StoredUser | null>(null);
  const stickyGoalRef = useRef<Goal | null>(null);

  useEffect(() => {
    stickyGoalRef.current = null;
  }, [goalId]);

  useEffect(() => {
    if (!authReady) return;
    if (!contextUser && !localUser) {
      stickyUserRef.current = null;
      stickyGoalRef.current = null;
    }
  }, [authReady, contextUser, localUser]);

  const userFromSources = contextUser ?? localUser;
  const goalFromSources = goalId
    ? contextGoals.find((g) => g.id === goalId) ?? localGoal ?? null
    : null;

  useEffect(() => {
    if (userFromSources) stickyUserRef.current = userFromSources;
    if (goalFromSources && goalId && goalFromSources.id === goalId) {
      stickyGoalRef.current = goalFromSources;
    }
  }, [userFromSources, goalFromSources, goalId]);

  const user =
    userFromSources ??
    (authReady && stickyUserRef.current ? stickyUserRef.current : null);
  const goal =
    goalFromSources ??
    (goalId && authReady && stickyGoalRef.current?.id === goalId
      ? stickyGoalRef.current
      : null);
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
  }, [goalId, authReady, user?.id, goal?.id, contextUser?.id]);

  const [step, setStep] = useState<"capture" | "uploading" | "result">("capture");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [verified, setVerified] = useState<boolean | null>(null);
  /** Shown on the result overlay (CLIP / save messaging). */
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [showFirstProofCelebration, setShowFirstProofCelebration] = useState(false);
  /** Bumps `AIVerificationWidget` key after a denied flow so the widget doesn’t keep the old verdict UI. */
  const [aiWidgetSession, setAiWidgetSession] = useState(0);
  const [streamReady, setStreamReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  /**
   * After the user starts a proof (uploading), never auto-open the fullscreen camera again
   * until they choose “Try another photo” — avoids reopening when `goal` refetches from context.
   */
  const [deferCameraAutostart, setDeferCameraAutostart] = useState(false);
  /**
   * Session / in-flow flag: user has started a proof for this goal, so we must not auto-open the
   * fullscreen camera or show the "Opening camera…" gate. **Separate from `deferCameraAutostart`**
   * so a remount with sessionStorage set does not hide the Local AI widget (that was the bug).
   */
  const [resumeAfterProofGate, setResumeAfterProofGate] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoStartCameraAttemptedRef = useRef(false);
  const aiWidgetMountRef = useRef<HTMLDivElement>(null);
  /** Prevents overlapping CLIP + persist runs (double shutter, slow CLIP, widget + camera). */
  const verifyInFlightRef = useRef(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const hasRedirected = useRef(false);
  const hasShownContent = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (verified !== true || !user?.id) {
      setShowFirstProofCelebration(false);
      return;
    }
    const verifiedTotal = submissions.filter((s) => s.status === "verified").length;
    // Only the first verified proof ever in this account should show the line (not after localStorage clears).
    if (verifiedTotal !== 1) {
      setShowFirstProofCelebration(false);
      return;
    }
    try {
      const key = firstProofSeenStorageKey(user.id);
      const seen = window.localStorage.getItem(key);
      if (!seen) {
        setShowFirstProofCelebration(true);
        window.localStorage.setItem(key, "1");
      } else {
        setShowFirstProofCelebration(false);
      }
    } catch {
      setShowFirstProofCelebration(false);
    }
  }, [verified, user?.id, submissions]);

  // Once we've shown the submit UI (camera), never redirect - avoids auth blips
  useEffect(() => {
    if (user && goal) hasShownContent.current = true;
  }, [user, goal]);

  const goalSubs = goal ? getSubmissionsForGoal(goal.id) : [];
  const inWindow = !!goal && isWithinSubmissionWindow(goal, new Date(), goalSubs);
  const alreadyVerifiedToday =
    !!goal && hasVerifiedSubmissionOnDate(goalSubs, todayStr);

  const wateringCelebration = useMemo(() => {
    if (!goal || verified !== true) return null;
    const streak = getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents);
    return {
      stage: getPlantStageForStreak(streak).stage,
      variant: getGoalPlantVariant(goal.id),
    };
  }, [goal, verified, getSubmissionsForGoal, graceDayEvents, getGoalPlantVariant, submissions]);

  const [, setHideHeader] = useHideHeader();
  const showStartingCameraForHeader =
    step === "capture" &&
    !cameraStarted &&
    !cameraError &&
    inWindow &&
    !deferCameraAutostart &&
    !resumeAfterProofGate;
  const hideHeaderForCamera =
    (step === "capture" && (cameraStarted || showStartingCameraForHeader)) ||
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
      // Prove tab: land on first due/submittable goal, else today's path
      const now = new Date();
      const today = format(new Date(), "yyyy-MM-dd");
      const pick =
        contextGoals.find(
          (g) =>
            !g.isOnBreak &&
            !g.archivedAt &&
            isWithinSubmissionWindow(g, now, getSubmissionsForGoal(g.id)) &&
            !hasVerifiedSubmissionOnDate(getSubmissionsForGoal(g.id), today)
        ) ?? null;
      hasRedirected.current = true;
      router.replace(pick ? `/goals/submit?goalId=${pick.id}` : "/dashboard#today-path");
      return;
    }
    if (!user) {
      hasRedirected.current = true;
      router.replace("/dashboard");
      return;
    }
    if (!goal) {
      hasRedirected.current = true;
      router.replace("/dashboard#today-path");
      return;
    }
  }, [
    authReady,
    user,
    goalId,
    goal,
    router,
    pageLoading,
    contextGoals,
    getSubmissionsForGoal,
  ]);

  useLayoutEffect(() => {
    if (!goalId || typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(submitCameraGateKey(goalId)) === "1") {
        setResumeAfterProofGate(true);
        autoStartCameraAttemptedRef.current = true;
      } else {
        setResumeAfterProofGate(false);
      }
    } catch {
      setResumeAfterProofGate(false);
    }
  }, [goalId]);

  const stopCamera = useCallback((keepCameraMode = false) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreamReady(false);
    if (!keepCameraMode) setCameraStarted(false);
  }, []);

  /**
   * After a successful proof, `goalSubs` includes today's verified row so `inWindow` becomes false.
   * If `step` resets to "capture" (remount, etc.), avoid showing the closed-window screen over the success flow.
   */
  useLayoutEffect(() => {
    if (!goal?.id) return;
    if (step !== "capture") return;
    if (!hasVerifiedSubmissionOnDate(goalSubs, todayStr)) return;
    setVerified(true);
    setStep("result");
    setResultSummary((prev) => (prev && prev.trim().length > 0 ? prev : "You're all set for today."));
    setDeferCameraAutostart(true);
    setResumeAfterProofGate(true);
    stopCamera();
  }, [goal?.id, goalSubs, todayStr, step, stopCamera]);

  const exitCameraToDashboard = useCallback(() => {
    stopCamera();
    setCameraStarted(false);
    router.push("/dashboard");
  }, [stopCamera, router]);

  const handleTryAnotherPhoto = useCallback(() => {
    if (goalId && typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(submitCameraGateKey(goalId));
      } catch {
        /* ignore */
      }
    }
    setDeferCameraAutostart(false);
    setResumeAfterProofGate(false);
    setStep("capture");
    setVerified(null);
    setResultSummary(null);
    setAiWidgetSession((n) => n + 1);
    autoStartCameraAttemptedRef.current = false;
    setCameraError(null);
    stopCamera();
  }, [goalId, stopCamera]);

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
      video.muted = true;
      video.playsInline = true;
      const tryPlay = () => {
        void video.play().catch(() => {});
      };
      tryPlay();
      video.addEventListener("loadedmetadata", tryPlay, { once: true });
      video.addEventListener("canplay", tryPlay, { once: true });
    }
  }, [step, streamReady]);

  useEffect(() => {
    if (!user || !goal) return;
    if (!inWindow) return;
    if (step !== "capture" || cameraStarted) return;
    if (deferCameraAutostart) return;
    if (resumeAfterProofGate) return;
    if (autoStartCameraAttemptedRef.current) return;
    autoStartCameraAttemptedRef.current = true;
    void handleStartCamera();
  }, [
    user?.id,
    goal?.id,
    goal,
    inWindow,
    step,
    cameraStarted,
    deferCameraAutostart,
    resumeAfterProofGate,
    handleStartCamera,
  ]);

  const persistCompressedProof = useCallback(
    async (compressed: string, clipSummary: string, aiPassed: boolean) => {
      const finish = (ok: boolean, summary: string | null) => {
        if (goal) {
          const subsBefore = getSubmissionsForGoal(goal.id);
          const stageBefore = getPlantStageForStreak(
            getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents)
          ).stage;
          const healthBefore = getWeeklyPlantState(goal, subsBefore, graceDayEvents);
          const subsAfter = [
            ...subsBefore,
            {
              date: todayStr,
              status: ok ? ("verified" as const) : ("rejected" as const),
            },
          ];
          const streakAfter = getGoalStreak(
            goal,
            (gid) => (gid === goal.id ? subsAfter : getSubmissionsForGoal(gid)),
            graceDayEvents
          );
          const stageAfter = getPlantStageForStreak(streakAfter).stage;
          const healthAfter = ok
            ? getWeeklyPlantState(goal, subsAfter, graceDayEvents)
            : healthBefore;
          setGardenProofFlash({
            goalId: goal.id,
            goalTitle: goal.title,
            verified: ok,
            stageBefore,
            stageAfter,
            healthBefore,
            healthAfter,
            stageUp: ok && stageAfter !== stageBefore,
            aiFeedback: summary ?? undefined,
          });
          if (ok) {
            if (summary?.trim()) setGardenersNote(goal.id, summary);
            completeGardenRecovery(goal.id);
            completeWelcomeWeekIfNeeded(goal, subsBefore, subsAfter);
          }
        }
        if (ok && goal) {
          hapticSuccess();
        } else if (ok) {
          hapticSuccess();
        }
        setVerified(ok);
        setResultSummary(summary);
        setStep("result");
      };

      if (!goal || !user) {
        finish(false, "Couldn’t save your proof. Try going back and opening this goal again.");
        return;
      }
      let imageToStore = compressed;
      const submissionId = generateId();
      const base64 = compressed.split(",")[1];
      if (!base64) {
        finish(false, "Couldn’t read that photo. Please try taking another picture.");
        return;
      }

      if (useSupabase && supabase) {
        try {
          const storageUrl = await uploadProofToStorage(supabase, user.id, submissionId, compressed);
          imageToStore = storageUrl;
        } catch {
          finish(false, "Couldn’t upload your photo. Check your connection and try again.");
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
        await updateSubmission(sub.id, {
          status: passed ? "verified" : "rejected",
          aiFeedback: msg,
          verifiedAt: passed ? new Date().toISOString() : undefined,
        });
        if (passed) {
          const g = goals.find((x: Goal) => x.id === goal.id);
          if (g && !g.completedDates.includes(todayStr)) {
            const savedGoal = await updateGoal(goal.id, {
              completedDates: [...g.completedDates, todayStr],
            });
            if (!savedGoal.ok) {
              console.error("persist proof: could not update goal dates", savedGoal.error);
            }
          }
        }
        finish(passed, msg);
      } catch {
        finish(false, "Something went wrong saving your proof. You can try again.");
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
      graceDayEvents,
    ]
  );

  const runProofVerification = useCallback(
    async (sourceDataUrl: string) => {
      if (!goal || !user) return;
      if (verifyInFlightRef.current) return;
      verifyInFlightRef.current = true;
      setResultSummary(null);
      lightImpact();
      setStep("uploading");
        if (goalId && typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(submitCameraGateKey(goalId), "1");
        } catch {
          /* ignore */
        }
        setResumeAfterProofGate(true);
        setDeferCameraAutostart(true);
      }
      const imageToStore = sourceDataUrl;

      try {
        const compressed = await compressImage(
          sourceDataUrl,
          verificationImageMaxSide(user.plan),
          user.plan === "pro" || user.plan === "premium" ? 0.75 : 0.65
        );
        const result = await verifyWithOpenAI({
          imageDataUrl: compressed,
          goalTitle: goal.title,
          goalDescription: goal.description,
          proofRequirement: goal.proofRequirement,
        });
        if (result.aiCoach) {
          setCoachUsage({
            used: result.aiCoach.used,
            remaining: result.aiCoach.remaining,
            limit: result.aiCoach.limit,
          });
        }
        if (result.limitReached) {
          setVerified(false);
          setResultSummary(result.feedback);
          setStep("result");
          return;
        }
        await persistCompressedProof(compressed, result.feedback, result.verified);
      } catch {
        try {
          await addSubmission({
            goalId: goal.id,
            date: todayStr,
            imageDataUrl: imageToStore,
            status: "rejected",
            aiFeedback: "Verification failed on this device. Try again.",
          });
        } catch {
          /* keep denied state */
        }
        setVerified(false);
        setResultSummary("Verification failed on this device. Try again.");
        setStep("result");
      } finally {
        verifyInFlightRef.current = false;
      }
    },
    [goal, goalId, user, todayStr, addSubmission, persistCompressedProof]
  );

  const handleAiWidgetResult = useCallback(
    (result: VerificationResult) => {
      if (!goal || !user) return;
      if (verifyInFlightRef.current) return;
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
      void (async () => {
        verifyInFlightRef.current = true;
        setResultSummary(null);
        lightImpact();
        setStep("uploading");
        if (goalId && typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem(submitCameraGateKey(goalId), "1");
          } catch {
            /* ignore */
          }
          setResumeAfterProofGate(true);
          setDeferCameraAutostart(true);
        }
        try {
          const compressed = await compressImage(
            proofUrl,
            verificationImageMaxSide(user.plan),
            user.plan === "pro" || user.plan === "premium" ? 0.75 : 0.65
          );
          const summary =
            result.feedback ??
            (result.verified
              ? `Verified for "${goal.title}".`
              : `Not verified for "${goal.title}". Try another photo that clearly shows it.`);
          await persistCompressedProof(compressed, summary, result.verified);
        } catch {
          setVerified(false);
          setResultSummary("Couldn’t process that photo. Try again.");
          setStep("result");
        } finally {
          verifyInFlightRef.current = false;
        }
      })();
    },
    [goal, goalId, user, persistCompressedProof]
  );

  const handleCloseApp = useCallback(() => {
    if (typeof window === "undefined") return;
    window.close();
    queueMicrotask(() => {
      void router.push("/dashboard");
    });
  }, [router]);

  const capturePhoto = useCallback(() => {
    if (verifyInFlightRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    const grabFrame = () => {
      if (video.videoWidth < 2 || video.videoHeight < 2) {
        setCameraError("Camera frame wasn’t ready. Try again in a second.");
        return;
      }
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
    };
    // One or two rAFs: some WebViews paint a black first frame right after stream attach.
    requestAnimationFrame(() => {
      requestAnimationFrame(grabFrame);
    });
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
  if (!inWindow && step === "capture" && !alreadyVerifiedToday) {
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
          <div className="rounded-2xl p-8 text-center glass-card">
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
    step === "capture" &&
    !cameraStarted &&
    !cameraError &&
    inWindow &&
    !deferCameraAutostart &&
    !resumeAfterProofGate;
  const showCameraRetry =
    step === "capture" && !showFullScreenCamera && !cameraStarted && !!cameraError;
  /** Tap-to-open camera card — after an in-session proof *or* when session gate says don’t auto-open. */
  const showManualCameraPickup =
    step === "capture" &&
    inWindow &&
    !showFullScreenCamera &&
    !cameraStarted &&
    !cameraError &&
    (deferCameraAutostart || resumeAfterProofGate);

  const hideMainForProofFlow = step === "uploading" || step === "result";
  const coachSummary = coachUsage
    ? coachUsage
    : user
      ? {
          used: aiCoachUsageSummary(user).used,
          remaining: getAiCoachRemaining(user),
          limit: aiCoachUsageSummary(user).limit,
        }
      : null;

  return (
    <>
      {step === "uploading" && (
        <ProofFlowOverlay>
          <div className="proof-flow-card glass-card ring-1 ring-black/5 dark:ring-white/10">
            {goal && (
              <div className="mx-auto mb-4 flex h-[88px] w-[88px] items-end justify-center">
                <PlantIllustration
                  stage={getPlantStageForStreak(
                    getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents)
                  ).stage}
                  variant={getGoalPlantVariant(goal.id)}
                  wateringLevel={0.55}
                  wateredGoals={0}
                  healthState="healthy"
                  size="small"
                />
              </div>
            )}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-prove-100/80 dark:bg-prove-900/40">
              <Loader2 className="h-6 w-6 animate-spin text-prove-600 dark:text-prove-400" />
            </div>
            <h2 className="mt-5 font-display text-xl font-bold text-slate-900 dark:text-white">
              Verifying your proof
            </h2>
            {goal ? (
              <p className="mt-2 text-sm font-medium text-prove-700 dark:text-prove-300">
                {goal.title}
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Checking that your photo matches this goal. This usually takes a few seconds.
            </p>
            <div className="mt-6 space-y-2 text-left text-xs text-slate-500 dark:text-slate-400">
              <p className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-prove-500 animate-pulse" />
                Reading your photo
              </p>
              <p className="flex items-center gap-2 opacity-80">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                Matching your goal
              </p>
            </div>
          </div>
        </ProofFlowOverlay>
      )}

      {step === "result" && verified !== null && (
        <ProofFlowOverlay>
          <div
            className={`proof-flow-card glass-card ring-1 ring-black/5 dark:ring-white/10 ${
              verified
                ? "border-emerald-300/70 dark:border-emerald-600/50"
                : "border-red-300/80 dark:border-red-600/45"
            }`}
          >
            {verified ? (
              <>
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                  <span className="animate-celebrate-burst absolute inset-0 rounded-full bg-prove-400/25" aria-hidden />
                  <CheckCircle2 className="relative h-14 w-14 text-prove-600 dark:text-prove-400 animate-celebrate-check" />
                </div>
                {wateringCelebration && (
                  <div className="mt-4">
                    <PlantWateringCelebration
                      stage={wateringCelebration.stage}
                      variant={wateringCelebration.variant}
                    />
                    <p className="mt-2 text-sm font-bold text-prove-800 dark:text-prove-200">
                      Verified — your plant drank!
                    </p>
                  </div>
                )}
              </>
            ) : coachSummary && coachSummary.remaining <= 0 ? (
              <>
                <XCircle className="mx-auto h-14 w-14 text-amber-500" />
                <p className="mt-3 text-sm font-bold text-amber-900 dark:text-amber-200">
                  AI Coach weekly limit reached
                </p>
              </>
            ) : (
              <>
                <XCircle className="mx-auto h-14 w-14 text-red-600 dark:text-red-400" />
                {goal && (
                  <div className="mx-auto mt-4 flex h-[100px] w-[100px] items-end justify-center opacity-90">
                    <PlantIllustration
                      stage={getPlantStageForStreak(
                        getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents)
                      ).stage}
                      variant={getGoalPlantVariant(goal.id)}
                      wateringLevel={0.15}
                      wateredGoals={0}
                      healthState="wilting"
                      size="small"
                    />
                  </div>
                )}
                <p className="mt-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                  Your plant stayed dry — photo didn&apos;t pass verification.
                </p>
              </>
            )}
            <h2 className="mt-5 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {verified
                ? "Proof counted in your garden"
                : coachSummary && coachSummary.remaining <= 0
                  ? "Come back next week"
                  : "Try another photo"}
            </h2>
            {resultSummary ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {resultSummary}
              </p>
            ) : null}
            {!verified && coachSummary && coachSummary.remaining <= 0 ? (
              <Link href="/pricing" className="cta-chunky mt-5 w-full">
                Upgrade for more AI Coach uses
              </Link>
            ) : null}
            {verified && resultSummary ? (
              <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
                Saved as a gardener&apos;s note on your plant (24h) in the Goal Garden.
              </p>
            ) : null}
            {verified && showFirstProofCelebration && (
              <p className="mt-4 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                First proof — you&apos;re on a streak! 🌱
              </p>
            )}
            <div className="mt-8 flex flex-col gap-3">
              {!verified && inWindow ? (
                <button
                  type="button"
                  onClick={handleTryAnotherPhoto}
                  className="rounded-xl bg-prove-600 py-3.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-prove-700"
                >
                  Try another photo
                </button>
              ) : null}
              {verified ? (
                <Link
                  href="/buddy"
                  className="rounded-xl bg-prove-600 py-3.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-prove-700"
                >
                  View in garden
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className={`rounded-xl py-3.5 text-center text-sm font-semibold shadow-sm ${
                  verified
                    ? "border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    : !verified && inWindow
                      ? "border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      : "bg-prove-600 text-white hover:bg-prove-700"
                }`}
              >
                {verified ? "Dashboard" : "Go to dashboard"}
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
        </ProofFlowOverlay>
      )}

      {!hideMainForProofFlow && (
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
              Snap a photo that matches your goal — when AI verifies it, your plant gets watered in
              the garden. One check-in per calendar day (Sun–Sat week for weekly targets).
            </p>
            {coachSummary ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-prove-400/70 bg-prove-50 px-3 py-1.5 text-xs font-black text-prove-900 dark:border-prove-600 dark:bg-prove-950/50 dark:text-prove-200">
                AI Coach · {coachSummary.remaining}/{coachSummary.limit} left this week (UTC)
              </div>
            ) : null}
            <div className="mt-6 rounded-2xl p-4 glass-card">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">AI verifier (optional)</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                When verification finishes here, your proof is saved like the camera flow.
              </p>
              <div className="mt-3" ref={aiWidgetMountRef}>
                <AIVerificationWidget
                  key={`${goal.id}-${aiWidgetSession}`}
                  goalTitle={goal.title}
                  goalDescription={goal.description}
                  proofRequirement={goal.proofRequirement}
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

        {(showCameraRetry || showManualCameraPickup) && (
          <div className="mt-8 animate-fade-in">
            {showCameraRetry && cameraError ? (
              <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                {cameraError}
              </p>
            ) : showManualCameraPickup ? (
              <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-200">
                Camera only opens when you tap below (it won&apos;t auto-open after you&apos;ve started a proof). Local
                AI above stays available.
              </p>
            ) : null}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
                <p className="text-center text-sm text-slate-300">
                  Tap to start camera
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCameraError(null);
                    autoStartCameraAttemptedRef.current = true;
                    void handleStartCamera();
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
              disablePictureInPicture
              controls={false}
              className="proof-camera-video absolute inset-0 h-full w-full object-cover"
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
                type="button"
                onClick={flipCamera}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                aria-label="Switch camera"
              >
                <SwitchCamera className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="glass-overlay-bar-btn-primary flex h-16 w-16 items-center justify-center rounded-full text-white hover:bg-prove-500/45"
                aria-label="Take photo"
              >
                <Camera className="h-8 w-8" />
              </button>
            </div>
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
