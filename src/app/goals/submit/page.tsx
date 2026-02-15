"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Upload, CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { AppProvider, useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";
import { isGoalDue, getDueDayName } from "@/lib/goalDue";
import { format } from "date-fns";

function SubmitProofContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const goalId = searchParams.get("goalId");
  const { user, goals, addSubmission, updateSubmission, updateGoal } = useApp();
  const goal = goals.find((g) => g.id === goalId);

  const [step, setStep] = useState<"capture" | "uploading" | "result">("capture");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) {
      router.replace("/dashboard");
      return;
    }
    if (!goalId || !goal) {
      router.replace("/goals");
      return;
    }
  }, [user, goalId, goal, router]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (typeof window === "undefined") return;

    const isLocalhost =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isSecure = window.isSecureContext;

    // Many mobile browsers block camera on plain HTTP over local IP.
    if (!isSecure && !isLocalhost) {
      alert(
        "Your browser is blocking the camera because this site is not using HTTPS.\n\nOn your phone, use the Upload button instead and choose Camera or Photo Library."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      console.error(e);
      alert("Could not access camera. You can upload a photo instead.");
    }
  }, []);

  useEffect(() => {
    if (step === "capture" && goalId) startCamera();
    return () => stopCamera();
  }, [step, goalId, startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setImageDataUrl(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      stopCamera();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submitForVerification = useCallback(async () => {
    if (!imageDataUrl || !goal) return;
    setStep("uploading");

    const base64 = imageDataUrl.split(",")[1];
    if (!base64) {
      setVerified(false);
      setFeedback("Invalid image.");
      setStep("result");
      return;
    }

    try {
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

      // Submit anytime on the due date: daily = anytime today, weekly = anytime on reminder day
      let withinWindow = true;
      if (goal.frequency === "daily") {
        withinWindow = true; // Can submit anytime before midnight
      } else if (goal.frequency === "weekly") {
        const reminderDay = typeof goal.reminderDay === "number" ? goal.reminderDay : 0;
        withinWindow = now.getDay() === reminderDay; // Can submit anytime on reminder day
      }

      const passed = aiPassed && withinWindow;
      const msg = withinWindow
        ? data.feedback ?? "Verification completed."
        : "Submit on your reminder day before midnight to count toward your streak.";

      const sub = await addSubmission({
        goalId: goal.id,
        date: todayStr,
        imageDataUrl,
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
        const g = goals.find((x) => x.id === goal.id);
        if (g && !g.completedDates.includes(todayStr)) {
          await updateGoal(goal.id, {
            completedDates: [...g.completedDates, todayStr],
          });
        }
      }
    } catch (err) {
      setVerified(false);
      setFeedback("Something went wrong. Please try again.");
      const sub = await addSubmission({
        goalId: goal.id,
        date: todayStr,
        imageDataUrl,
        status: "rejected",
        aiFeedback: "Request failed.",
      });
      setSubmissionId(sub.id);
    }
    setStep("result");
  }, [imageDataUrl, goal, todayStr, addSubmission, updateSubmission, updateGoal, goals]);

  if (!user || !goal) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-slate-600 dark:text-slate-400">Loading…</p>
        </main>
      </>
    );
  }

  const due = isGoalDue(goal);
  const dueDayName = getDueDayName(goal);

  if (!due) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-lg px-4 py-8">
          <Link
            href="/goals"
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to goals
          </Link>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {goal.title}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Proof isn’t due yet. Come back {dueDayName ? `on ${dueDayName}` : "on your reminder day"} to submit.
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

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 py-8">
        <Link
          href="/goals"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to goals
        </Link>

        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Submit proof: {goal.title}
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Take a photo or upload one showing you doing this goal. AI will verify it.
        </p>

        {step === "capture" && (
          <div className="mt-8 animate-fade-in">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
              {!imageDataUrl ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button
                      onClick={capturePhoto}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg hover:bg-slate-100"
                      aria-label="Take photo"
                    >
                      <Camera className="h-7 w-7" />
                    </button>
                    <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white text-slate-900 shadow-lg hover:bg-slate-100">
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
                </>
              ) : (
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
                        startCamera();
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300"
                    >
                      Retake
                    </button>
                    <button
                      onClick={submitForVerification}
                      className="rounded-lg bg-prove-600 px-4 py-2 text-sm font-medium text-white hover:bg-prove-700"
                    >
                      Verify with AI
                    </button>
                  </div>
                </div>
              )}
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
                href="/goals"
                className="flex-1 rounded-lg border border-slate-300 py-3 text-center font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                All goals
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function SubmitProofPage() {
  return (
    <AppProvider>
      <SubmitProofContent />
    </AppProvider>
  );
}
