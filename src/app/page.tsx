"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { PLANS, type PlanId } from "@/types";
import {
  loginIdentifierToAuthEmail,
  normalizeUsername,
  usernameToAuthEmail,
} from "@/lib/usernameAuth";
import { setPostPlanWelcomeFlag } from "@/lib/postPlanWelcome";
import { startStripeCheckout } from "@/lib/checkoutClient";
import { formatUsd, planPriceForBilling } from "@/lib/billing";
import { shouldShowOnboardingSlideshow } from "@/lib/onboardingStorage";
import { writeStoredDisplayName } from "@/lib/displayNameStorage";
import { startDashboardTourForNewUser } from "@/lib/tourStorage";
import { consumePostAuthRedirect } from "@/lib/postAuthRedirect";
const INTRO_SLIDE_COUNT = 8;
const AUTH_SLIDE = 6 as const;
const PLAN_SLIDE = 7 as const;
type Slide = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type AuthMode = "signin" | "signup";

function introCardMotion(
  index: number,
  slideProgress: number,
  isDragging: boolean
): CSSProperties {
  const delta = index - slideProgress;
  const abs = Math.abs(delta);
  const rotateY = Math.max(-12, Math.min(12, delta * -12));
  const scale = Math.max(0.94, 1 - abs * 0.04);
  const translateZ = -Math.min(abs * 36, 80);
  const opacity = abs > 1.08 ? 0 : 1 - abs * 0.12;

  return {
    transform: `rotateY(${rotateY}deg) scale(${scale}) translateZ(${translateZ}px)`,
    opacity,
    zIndex: Math.round(24 - abs * 8),
    backfaceVisibility: "hidden",
    transition: isDragging
      ? "none"
      : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease",
  };
}

function IntroSlideCard({
  index,
  slideProgress,
  isDragging,
  className = "",
  children,
}: {
  index: Slide;
  slideProgress: number;
  isDragging: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="flex h-full min-h-full w-[12.5%] shrink-0 items-stretch px-2 py-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-[max(0.35rem,env(safe-area-inset-top))]"
      aria-hidden={Math.abs(index - slideProgress) > 0.55}
    >
      <div
        className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 ${className}`}
        style={introCardMotion(index, slideProgress, isDragging)}
      >
        {children}
      </div>
    </section>
  );
}

function IntroStorySlide({
  index,
  slideProgress,
  isDragging,
  eyebrow,
  title,
  body,
  imageSrc,
  imageAlt,
  imageContain = false,
  onBack,
  onNext,
  nextLabel = "Next",
}: {
  index: Slide;
  slideProgress: number;
  isDragging: boolean;
  eyebrow: string;
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  imageContain?: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <IntroSlideCard index={index} slideProgress={slideProgress} isDragging={isDragging}>
      <div className="flex h-full min-h-full w-full flex-col bg-[#f7f7f8] px-5 pb-[max(5.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex h-10 shrink-0 items-start">
          <button
            type="button"
            onClick={onBack}
            className="w-fit rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/80 active:bg-slate-50"
          >
            Back
          </button>
        </div>
        <div className="shrink-0 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-prove-600">
            {eyebrow}
          </p>
          <h2 className="mt-2 max-w-[12ch] font-display text-[2.35rem] font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl">
            {title}
          </h2>
          <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-slate-500">
            {body}
          </p>
        </div>
        <div className="relative mt-5 min-h-0 flex-1">
          <div className="absolute inset-0 overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-slate-200/70">
            <img
              src={imageSrc}
              alt={imageAlt}
              className={`h-full w-full ${imageContain ? "object-contain p-4" : "object-cover"}`}
            />
          </div>
        </div>
        <div className="shrink-0 pt-4">
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-2xl bg-prove-600 py-3.5 text-[15px] font-semibold text-white shadow-sm active:opacity-90"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </IntroSlideCard>
  );
}

// Format-only check for real-looking email (password reset by email)
const EMAIL_FORMAT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authReady, hasSelectedPlan, isDevGuestMode, setUser, setPlan, useSupabase, supabase } =
    useApp();

  const [slide, setSlide] = useState<Slide>(0);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [loading, setLoading] = useState(false);
  /** Non-null = show success-style reset feedback (message from API when available). */
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  const touchStartX = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const requestedStep = searchParams.get("step");
  const authError = searchParams.get("error");
  const [sessionSettled, setSessionSettled] = useState(false);
  const welcomeDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authError === "auth") {
      setSessionSettled(true);
      setSlide(AUTH_SLIDE);
      setLoginError("Sign-in failed. Try again.");
      setAuthMode("signin");
      router.replace("/?step=login", { scroll: false });
    }
  }, [authError, router]);

  useEffect(() => {
    if (!authReady) return;

    if (user) {
      if (welcomeDelayRef.current) {
        clearTimeout(welcomeDelayRef.current);
        welcomeDelayRef.current = null;
      }
      setSessionSettled(true);
      if (hasSelectedPlan) {
        const redirect = consumePostAuthRedirect();
        router.replace(redirect ?? "/dashboard");
        return;
      }
      if (isDevGuestMode || shouldShowOnboardingSlideshow()) {
        setSessionSettled(true);
        setSlide(0);
        return;
      }
      if (requestedStep === "plan") {
        setSlide(PLAN_SLIDE);
        return;
      }
      setSlide(PLAN_SLIDE);
      return;
    }

    if (requestedStep === "plan") {
      setSessionSettled(true);
      setSlide(PLAN_SLIDE);
      return;
    }
    if (requestedStep === "login") {
      setSessionSettled(true);
      setSlide(AUTH_SLIDE);
      return;
    }

    // No user and no step: might be first-time or returning from email confirmation.
    // Wait briefly for session to restore; if user appears we go to plan/dashboard above.
    if (!sessionSettled) {
      if (welcomeDelayRef.current) return;
      welcomeDelayRef.current = setTimeout(() => {
        welcomeDelayRef.current = null;
        setSessionSettled(true);
        setSlide(0);
      }, 700);
    } else {
      setSlide(0);
    }

    return () => {
      if (welcomeDelayRef.current) {
        clearTimeout(welcomeDelayRef.current);
        welcomeDelayRef.current = null;
      }
    };
  }, [authReady, user, hasSelectedPlan, isDevGuestMode, requestedStep, router, sessionSettled]);

  const goTo = (next: Slide) => {
    dragOffsetRef.current = 0;
    isDraggingRef.current = false;
    setDragOffsetPx(0);
    setIsDragging(false);
    setSlide(next);
  };

  const clampDragOffset = useCallback((raw: number, currentSlide: Slide) => {
    let offset = raw;
    if (currentSlide === 0 && offset > 0) offset *= 0.28;
    if (currentSlide === INTRO_SLIDE_COUNT - 1 && offset < 0) offset *= 0.28;
    return offset;
  }, []);

  const handleDragStart = useCallback((x: number) => {
    touchStartX.current = x;
    dragOffsetRef.current = 0;
    isDraggingRef.current = true;
    setDragOffsetPx(0);
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback(
    (x: number) => {
      if (touchStartX.current == null || !isDraggingRef.current) return;
      const offset = clampDragOffset(x - touchStartX.current, slide);
      dragOffsetRef.current = offset;
      setDragOffsetPx(offset);
    },
    [clampDragOffset, slide]
  );

  const handleDragEnd = useCallback(() => {
    if (touchStartX.current == null) return;
    const width = viewportRef.current?.clientWidth ?? window.innerWidth;
    const threshold = Math.min(72, width * 0.18);
    const offset = dragOffsetRef.current;
    touchStartX.current = null;
    dragOffsetRef.current = 0;
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragOffsetPx(0);

    if (offset > threshold && slide > 0) {
      setSlide((prev) => (prev - 1) as Slide);
    } else if (offset < -threshold && slide < INTRO_SLIDE_COUNT - 1) {
      setSlide((prev) => (prev + 1) as Slide);
    }
  }, [slide]);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseUp = () => handleDragEnd();
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [isDragging, handleDragEnd]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const sync = () => setViewportWidth(el.clientWidth);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sessionSettled, authReady]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedLogin = loginId.trim();
    if (authMode === "signup" && !trimmedName) {
      setLoginError("Please enter your name or nickname.");
      return;
    }
    if (!trimmedLogin) {
      setLoginError(authMode === "signup" ? "Please choose a username." : "Please enter your username or email.");
      return;
    }

    let authEmail: string;
    let signupUsername: string | null = null;
    if (authMode === "signup") {
      const u = normalizeUsername(trimmedLogin);
      if (!u) {
        setLoginError("Username must be 3–20 characters: letters, numbers, or underscore.");
        return;
      }
      signupUsername = u;
      authEmail = usernameToAuthEmail(u);
    } else {
      const resolved = loginIdentifierToAuthEmail(trimmedLogin);
      if (!resolved) {
        setLoginError("Enter a valid username or email address.");
        return;
      }
      authEmail = resolved;
    }

    if (password.length < 6) {
      setLoginError("Password must be at least 6 characters.");
      return;
    }
    setLoginError("");
    setResetFeedback(null);

    if (useSupabase && supabase) {
      setLoading(true);
      try {
        if (authMode === "signin") {
          const { error } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
          });
          if (error) {
            setLoginError(
              error.message === "Invalid login credentials"
                ? "Invalid username or password."
                : error.message
            );
            return;
          }
        } else {
          try {
            const checkRes = await fetch("/api/auth/check-signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                signupUsername ? { username: signupUsername } : { email: authEmail }
              ),
            });
            const checkData = await checkRes.json().catch(() => ({}));
            if (!checkRes.ok || checkData.available === false) {
              setLoginError(
                typeof checkData.error === "string"
                  ? checkData.error
                  : "That username is already taken."
              );
              return;
            }
          } catch {
            setLoginError("Could not verify username. Try again.");
            return;
          }

          const { data, error } = await supabase.auth.signUp({
            email: authEmail,
            password,
            options: {
              emailRedirectTo:
                typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback` : undefined,
            },
          });
          if (error) {
            setLoginError(
              /already registered|already been registered/i.test(error.message)
                ? "That username is already taken."
                : error.message
            );
            return;
          }

          if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            setLoginError("That username is already taken.");
            return;
          }

          // Auto-confirm new users via admin API so they can sign in immediately.
          try {
            if (data?.user?.id) {
              await fetch("/api/auth/auto-confirm-signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: data.user.id }),
              });
            }
          } catch {
            // If this fails, we still attempt sign-in; Supabase settings will decide.
          }

          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
          });
          if (signInError) {
            setLoginError(signInError.message);
            return;
          }
          setLoginError("");
          if (typeof window !== "undefined" && data?.user?.id && trimmedName) {
            writeStoredDisplayName(data.user.id, trimmedName);
          }
          if (signupUsername) {
            try {
              await fetch("/api/profile", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: signupUsername, name: trimmedName || undefined }),
              });
            } catch {
              // Profile row still usable; user can retry from settings if needed.
            }
          }
          return;
        }
      } catch (err) {
        setLoginError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    } else {
      // No Supabase: only allow demo “sign up”, never sign in (would accept any password).
      if (authMode === "signin") {
        setLoginError("Sign-in requires server configuration. Use “Create account” or set up Supabase.");
        return;
      }
      const u = signupUsername ?? normalizeUsername(trimmedLogin);
      if (!u) {
        setLoginError("Username must be 3–20 characters: letters, numbers, or underscore.");
        return;
      }
      const now = new Date().toISOString();
      const uid = user?.id ?? `user-${Date.now()}`;
      setUser({
        id: uid,
        email: usernameToAuthEmail(u),
        username: u,
        plan: user?.plan ?? "free",
        createdAt: user?.createdAt ?? now,
        name: trimmedName || user?.name,
      });
      if (typeof window !== "undefined") {
        writeStoredDisplayName(uid, trimmedName || user?.name || "");
      }
      setLoginError("");
    }
  };

  const handleForgotPassword = async () => {
    const raw = loginId.trim();
    if (!raw) {
      setLoginError("Enter your username or email first.");
      return;
    }
    if (!useSupabase || !supabase) return;
    setLoading(true);
    setLoginError("");
    setResetFeedback(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const isEmail = raw.includes("@");
      if (isEmail) {
        const lower = raw.toLowerCase();
        if (!EMAIL_FORMAT.test(lower)) {
          setLoginError("Please enter a valid email address.");
          return;
        }
        const res = await fetch("/api/auth/send-reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: lower, origin }),
        });
        const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        if (res.ok) {
          setResetFeedback(
            typeof data.message === "string" ? data.message : "Check your email for the reset link."
          );
          return;
        }
        if (res.status === 501) {
          const { error } = await supabase.auth.resetPasswordForEmail(lower, {
            redirectTo: origin ? `${origin}/api/auth/callback?next=/reset-password` : undefined,
          });
          if (error) {
            setLoginError(error.message);
            return;
          }
          setResetFeedback(
            "If your account uses this email, check your inbox (and spam). If nothing arrives, the project may need Resend configured (RESEND_API_KEY + RESEND_FROM_EMAIL) so reset emails can send reliably."
          );
          return;
        }
        setLoginError(typeof data.error === "string" ? data.error : "Something went wrong. Try again.");
        return;
      }

      const u = normalizeUsername(raw);
      if (!u) {
        setLoginError("Enter a valid username.");
        return;
      }
      const res = await fetch("/api/auth/send-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, origin }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (res.ok) {
        setResetFeedback(
          typeof data.message === "string" ? data.message : "Check your email for the reset link."
        );
        return;
      }
      if (res.status === 400 && typeof data.error === "string") {
        setLoginError(data.error);
        return;
      }
      if (res.status === 501) {
        setLoginError(
          "Password reset by username needs the server to send email (Resend + Supabase service role). Until that’s set up, use “Forgot password” with the real email you added in Settings, or contact support."
        );
        return;
      }
      setLoginError(typeof data.error === "string" ? data.error : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChoosePlan = useCallback(
    async (planId: PlanId) => {
      if (!user) {
        setAuthMode("signup");
        setLoginError("");
        setSlide(AUTH_SLIDE);
        return;
      }
      if (planId === "free") {
        const ok = await setPlan(planId, "monthly");
        if (!ok) return;
        setPostPlanWelcomeFlag(planId);
        startDashboardTourForNewUser();
        router.push("/dashboard");
        return;
      }
      const checkout = await startStripeCheckout(planId, "monthly");
      if (checkout.ok) {
        window.location.href = checkout.url;
        return;
      }
      const ok = await setPlan(planId, "monthly");
      if (ok) {
        setPostPlanWelcomeFlag(planId);
        startDashboardTourForNewUser();
        router.push("/dashboard");
      }
    },
    [router, setPlan, user]
  );

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading your account…</p>
      </main>
    );
  }

  // After redirect (e.g. email confirmation), wait briefly for session to restore before showing welcome
  if (!sessionSettled && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </main>
    );
  }

  const slideProgress =
    slide - (viewportWidth > 0 ? dragOffsetPx / viewportWidth : 0);

  return (
    <main
      data-intro-fullscreen
      className="fixed inset-0 z-[200] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-[#f7f7f8] touch-pan-y"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      <div
        ref={viewportRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-visible [perspective:1400px]"
        style={{ touchAction: isDragging ? "none" : "pan-y" }}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
        onTouchCancel={handleDragEnd}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleDragMove(e.clientX);
        }}
        onMouseUp={handleDragEnd}
      >
        {/* Slides container */}
        <div
          className={`flex min-h-0 flex-1 w-[800%] ${
            isDragging ? "" : "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          }`}
          style={{
            transform: `translate3d(calc(-${slide * (100 / INTRO_SLIDE_COUNT)}% + ${dragOffsetPx}px), 0, 0)`,
            transformStyle: "preserve-3d",
            willChange: isDragging ? "transform" : "auto",
          }}
        >
          {/* Slide 0 – Welcome */}
          <IntroSlideCard index={0} slideProgress={slideProgress} isDragging={isDragging}>
            <div className="mx-auto flex w-full max-w-sm min-h-0 flex-1 flex-col bg-[#f7f7f8] px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
              <div className="h-8 shrink-0" aria-hidden />
              <div className="shrink-0 text-center">
                <p className="font-display text-[1.65rem] font-bold tracking-tight text-prove-700">
                  Proveit
                </p>
                <h1 className="mt-6 font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-slate-950 sm:text-5xl">
                  Prove it.
                  <br />
                  Grow it.
                </h1>
                <p className="mx-auto mt-4 max-w-[28ch] text-[15px] leading-relaxed text-slate-500">
                  Photo proof. AI check. A plant that grows with you.
                </p>
              </div>
              <div className="relative mt-8 min-h-0 flex-1">
                <div className="absolute inset-0 overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-slate-200/70">
                  <img
                    src="/onboarding/garden-streak.jpg"
                    alt="Healthy green plants"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="flex w-full shrink-0 items-center justify-center bg-[#f7f7f8] px-5 pb-[max(5rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex w-full max-w-sm flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  className="w-full rounded-2xl bg-prove-600 py-3.5 text-[15px] font-semibold text-white shadow-sm active:opacity-90"
                >
                  See how it works
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signin");
                    setLoginError("");
                    goTo(AUTH_SLIDE);
                  }}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 active:bg-slate-50"
                >
                  I already have an account
                </button>
              </div>
            </div>
          </IntroSlideCard>

          <IntroStorySlide
            index={1}
            slideProgress={slideProgress}
            isDragging={isDragging}
            eyebrow="Step 1"
            title="Snap your proof."
            body="Take a fresh photo of the habit — a walk, a workout, a book page."
            imageSrc="/onboarding/snap-proof.jpg"
            imageAlt="Running shoe as workout proof"
            onBack={() => goTo(0)}
            onNext={() => goTo(2)}
          />

          <IntroStorySlide
            index={2}
            slideProgress={slideProgress}
            isDragging={isDragging}
            eyebrow="Step 2"
            title="AI checks it."
            body="Proveit matches the photo to your goal so check-ins stay honest."
            imageSrc="/onboarding/ai-check.jpg"
            imageAlt="Open book as an example proof photo"
            onBack={() => goTo(1)}
            onNext={() => goTo(3)}
          />

          <IntroStorySlide
            index={3}
            slideProgress={slideProgress}
            isDragging={isDragging}
            eyebrow="Step 3"
            title="Water your plant."
            body="Verified proofs grow your garden over time — one clear win each day."
            imageSrc="/onboarding/plant-growth.jpg"
            imageAlt="Seedling growing in an open hand"
            onBack={() => goTo(2)}
            onNext={() => goTo(4)}
          />

          <IntroStorySlide
            index={4}
            slideProgress={slideProgress}
            isDragging={isDragging}
            eyebrow="Streaks"
            title="Miss a week? It wilts first."
            body="Two-week grace: prove again to keep the plant. Your streak still resets."
            imageSrc="/onboarding/wilt-grace.jpg"
            imageAlt="Wilting houseplant on a windowsill"
            onBack={() => goTo(3)}
            onNext={() => goTo(5)}
          />

          <IntroStorySlide
            index={5}
            slideProgress={slideProgress}
            isDragging={isDragging}
            eyebrow="Buddies"
            title="Grow together."
            body="Share a goal, see each other’s progress, and keep each other honest."
            imageSrc="/onboarding/buddies.jpg"
            imageAlt="Trainer and athlete working out together"
            onBack={() => goTo(4)}
            onNext={() => {
              setLoginError("");
              if (user) {
                goTo(PLAN_SLIDE);
                return;
              }
              setAuthMode("signup");
              goTo(AUTH_SLIDE);
            }}
            nextLabel={user ? "Choose plan" : "Get started"}
          />

          {/* Slide 6 – Sign in */}
          <IntroSlideCard index={AUTH_SLIDE} slideProgress={slideProgress} isDragging={isDragging}>
            <div className="flex min-h-0 flex-1 flex-col bg-[#f7f7f8] px-5 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="mx-auto flex w-full max-w-sm min-h-0 flex-1 flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-prove-600">
                  Account
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">
                  {authMode === "signin" ? "Sign in" : "Create account"}
                </h2>
                <p className="mt-1 text-[14px] text-slate-500">
                  {authMode === "signin" ? "Welcome back." : "Then pick a plan."}
                </p>
                <div className="mt-5 overflow-y-auto">
                  <form onSubmit={handleLoginSubmit} className="space-y-2.5 pb-2">
                    {loginError && (
                      <p className="text-[13px] text-red-500" role="alert">{loginError}</p>
                    )}
                    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 [&>*]:border-b [&>*]:border-slate-100 last:[&>*]:border-b-0">
                      {authMode === "signup" && (
                        <label className="block">
                          <span className="sr-only">Name or nickname</span>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-transparent px-3.5 py-3 text-[16px] text-slate-900 placeholder-slate-400 focus:outline-none"
                            placeholder="Name or nickname"
                          />
                        </label>
                      )}
                      <label className="block">
                        <span className="sr-only">
                          {authMode === "signup" ? "Username" : "Username or email"}
                        </span>
                        <input
                          type="text"
                          name="username"
                          autoComplete="username"
                          value={loginId}
                          onChange={(e) => setLoginId(e.target.value)}
                          className="w-full bg-transparent px-3.5 py-3 text-[16px] text-slate-900 placeholder-slate-400 focus:outline-none"
                          placeholder={authMode === "signup" ? "Username" : "Username or email"}
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">Password</span>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent px-3.5 py-3 text-[16px] text-slate-900 placeholder-slate-400 focus:outline-none"
                          placeholder={authMode === "signup" ? "Password (6+)" : "Password"}
                          required
                        />
                      </label>
                    </div>
                    {useSupabase && authMode === "signin" && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={loading}
                        className="text-[14px] text-prove-600"
                      >
                        Forgot password?
                      </button>
                    )}
                    {resetFeedback && (
                      <p className="text-[14px] text-prove-600" role="status">
                        {resetFeedback}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-2xl bg-prove-600 py-3 text-[15px] font-semibold text-white active:opacity-90 disabled:opacity-70"
                    >
                      {loading ? "Loading…" : authMode === "signin" ? "Sign in" : "Create account"}
                    </button>
                    {authMode === "signup" && (
                      <p className="text-center text-[12px] text-slate-500">
                        By creating an account you agree to our{" "}
                        <Link href="/privacy" className="text-prove-600 hover:underline">
                          Privacy Policy
                        </Link>{" "}
                        and{" "}
                        <Link href="/terms" className="text-prove-600 hover:underline">
                          Terms of Use
                        </Link>
                        .
                      </p>
                    )}
                    {useSupabase && (
                      <p className="text-center text-[14px] text-slate-500">
                        {authMode === "signin" ? (
                          <>
                            New?{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode("signup");
                                setLoginError("");
                              }}
                              className="font-medium text-prove-600"
                            >
                              Create account
                            </button>
                          </>
                        ) : (
                          <>
                            Have an account?{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode("signin");
                                setLoginError("");
                              }}
                              className="font-medium text-prove-600"
                            >
                              Sign in
                            </button>
                          </>
                        )}
                      </p>
                    )}
                  </form>
                </div>
              </div>
              <div className="mx-auto mt-2 flex w-full max-w-sm shrink-0 items-center justify-between pb-[max(4.5rem,env(safe-area-inset-bottom))] text-[12px] text-slate-500">
                <button type="button" onClick={() => goTo(5)} className="active:opacity-70">
                  Back
                </button>
                <span>Plan comes next</span>
              </div>
            </div>
          </IntroSlideCard>

          {/* Slide 7 – Choose plan */}
          <IntroSlideCard index={PLAN_SLIDE} slideProgress={slideProgress} isDragging={isDragging}>
            <div className="flex min-h-0 flex-1 flex-col bg-[#f7f7f8] px-5 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="mx-auto flex w-full max-w-sm min-h-0 flex-1 flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-prove-600">
                  Plan
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">
                  Choose your plan
                </h2>
                <p className="mt-1 text-[14px] text-slate-500">
                  Start free, or go Pro / Premium anytime.
                </p>
                <div className="mt-4 space-y-2.5">
                  {[...PLANS]
                    .sort((a, b) => {
                      const order: Record<string, number> = { free: 0, pro: 1, premium: 2 };
                      return order[a.id] - order[b.id];
                    })
                    .map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => handleChoosePlan(plan.id as PlanId)}
                        className={`w-full rounded-2xl border bg-white text-left shadow-sm transition active:scale-[0.99] ${
                          plan.id === "pro"
                            ? "border-prove-400 shadow-prove-600/10"
                            : "border-slate-200/90 hover:border-slate-300"
                        }`}
                      >
                        <div className="px-4 py-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              {plan.id === "pro" && (
                                <span className="mb-1.5 inline-block rounded-full bg-prove-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-prove-700">
                                  Popular
                                </span>
                              )}
                              <p className="text-[16px] font-bold text-slate-900">{plan.name}</p>
                              <p className="mt-0.5 text-[12px] text-slate-500">
                                {plan.maxGoals === -1 ? "Unlimited" : plan.maxGoals} goal
                                {(plan.maxGoals ?? 0) !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 text-[14px] font-bold ${
                                plan.id === "free" ? "text-slate-700" : "text-prove-600"
                              }`}
                            >
                              {plan.id === "free" ? "Free" : `${formatUsd(plan.priceMonthly)}/mo`}
                            </span>
                          </div>
                          <ul className="mt-2 flex flex-col gap-1 text-[11px] leading-snug text-slate-600">
                            {plan.features.slice(0, 2).map((f, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="mt-0.5 shrink-0 text-prove-500" aria-hidden>
                                  ✓
                                </span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
              <div className="mx-auto mt-2 flex w-full max-w-sm shrink-0 items-center justify-between pb-[max(4.5rem,env(safe-area-inset-bottom))] text-[12px] text-slate-500">
                <button type="button" onClick={() => goTo(AUTH_SLIDE)} className="active:opacity-70">
                  Back
                </button>
                <span>Swipe ← back</span>
              </div>
            </div>
          </IntroSlideCard>
        </div>

        {/* Dots + legal */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#f7f7f8] via-[#f7f7f8]/90 to-transparent pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-10">
          <div className="pointer-events-auto flex items-center justify-center gap-[clamp(0.3rem,1.2vw,0.45rem)] px-4 animate-welcome-dots [animation-fill-mode:forwards]">
            {Array.from({ length: INTRO_SLIDE_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i as Slide)}
                className={`rounded-full transition-all duration-300 ${
                  slide === i
                    ? "h-1.5 w-5 bg-prove-600"
                    : "h-1.5 w-1.5 bg-slate-300"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <p className="pointer-events-auto mt-2 text-center text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-slate-600 hover:underline">
              Privacy
            </Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="hover:text-slate-600 hover:underline">
              Terms
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return <LandingContent />;
}
