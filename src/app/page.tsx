"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { startDashboardTourForNewUser } from "@/lib/tourStorage";
import { consumePostAuthRedirect } from "@/lib/postAuthRedirect";

const INTRO_SLIDE_COUNT = 6;
type Slide = 0 | 1 | 2 | 3 | 4 | 5;
type AuthMode = "signin" | "signup";

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
  const touchEndX = useRef<number | null>(null);
  const requestedStep = searchParams.get("step");
  const authError = searchParams.get("error");
  const [sessionSettled, setSessionSettled] = useState(false);
  const welcomeDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authError === "auth") {
      setSessionSettled(true);
      setSlide(4);
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
        setSlide(5);
        return;
      }
      setSlide(5);
      return;
    }

    if (requestedStep === "plan") {
      setSessionSettled(true);
      setSlide(5);
      return;
    }
    if (requestedStep === "login") {
      setSessionSettled(true);
      setSlide(4);
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
    setSlide(next);
  };

  const handleTouchStart = (x: number) => {
    touchStartX.current = x;
    touchEndX.current = null;
  };

  const handleTouchMove = (x: number) => {
    touchEndX.current = x;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const delta = touchEndX.current - touchStartX.current;
    const threshold = 50; // px
    if (delta > threshold && slide > 0) {
      setSlide((prev) => (prev - 1) as Slide);
    } else if (delta < -threshold && slide < INTRO_SLIDE_COUNT - 1) {
      setSlide((prev) => (prev + 1) as Slide);
    }
  };

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
          if (typeof window !== "undefined") {
            window.localStorage.setItem("proveit_display_name", trimmedName);
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
      setUser({
        id: user?.id ?? `user-${Date.now()}`,
        email: usernameToAuthEmail(u),
        username: u,
        plan: user?.plan ?? "free",
        createdAt: user?.createdAt ?? now,
        name: trimmedName || user?.name,
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("proveit_display_name", trimmedName || user?.name || "");
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
        setSlide(4);
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

  return (
    <main
      data-intro-fullscreen
      className="fixed inset-0 z-[200] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-slate-950 touch-pan-y"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        onTouchStart={(e) => handleTouchStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
        onTouchEnd={handleTouchEnd}
        onMouseDown={(e) => handleTouchStart(e.clientX)}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleTouchMove(e.clientX);
        }}
        onMouseUp={handleTouchEnd}
      >
        {/* Slides container */}
        <div
          className="flex min-h-0 flex-1 w-[600%] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${slide * (100 / INTRO_SLIDE_COUNT)}%)` }}
        >
          {/* Slide 0 – Welcome */}
          <section className="flex h-full min-h-full w-1/6 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-white to-prove-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-prove-950/30">
            <div className="mx-auto flex w-full max-w-sm min-h-0 flex-1 flex-col px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="h-10 shrink-0" aria-hidden />
              <div className="shrink-0 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-prove-600 dark:text-prove-300">
                  Welcome to Proveit
                </p>
                <h1 className="mt-4 font-display text-6xl font-bold leading-[0.95] tracking-tight text-slate-950 dark:text-white">
                  Grow habits with proof.
                </h1>
                <p className="mx-auto mt-5 max-w-[28ch] text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  Build a weekly routine, prove it with fresh photos, and keep your garden alive.
                </p>
                <div className="mx-auto mt-8 grid max-w-xs grid-cols-3 gap-2 text-center text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  <div className="rounded-2xl bg-white/75 px-2 py-3 shadow-sm dark:bg-slate-900/70">Goals</div>
                  <div className="rounded-2xl bg-white/75 px-2 py-3 shadow-sm dark:bg-slate-900/70">Proof</div>
                  <div className="rounded-2xl bg-white/75 px-2 py-3 shadow-sm dark:bg-slate-900/70">Plants</div>
                </div>
              </div>
              <div className="min-h-0 flex-1" aria-hidden />
            </div>
            <div className="flex w-full shrink-0 items-center justify-center px-5 pb-[max(5rem,env(safe-area-inset-bottom))]">
              <div className="flex w-full max-w-sm flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    goTo(1);
                  }}
                  className="rounded-2xl bg-prove-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-prove-600/25 transition hover:bg-prove-700 dark:bg-prove-500 dark:shadow-prove-500/20 dark:hover:bg-prove-400 btn-glass-primary"
                >
                  See how it works
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signin");
                    setLoginError("");
                    goTo(4);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200"
                >
                  I already have an account
                </button>
              </div>
            </div>
          </section>

          {/* Slide 1 – AI verification */}
          <section className="relative flex h-full min-h-full w-1/6 shrink-0 flex-col overflow-hidden bg-[#061527]">
            <img
              src="/onboarding/book-proof.png"
              alt="Book proof example"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#061527]/95 via-[#061527]/25 to-[#061527]/95" />
            <div className="relative flex h-full min-h-full w-full flex-col px-5 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-white">
              <div className="flex h-10 shrink-0 items-start">
                <button
                  type="button"
                  onClick={() => goTo(0)}
                  className="w-fit rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur-md active:bg-white/25"
                >
                  Back
                </button>
              </div>
              <div className="shrink-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-prove-200">
                  AI proof check
                </p>
                <h2 className="mt-3 max-w-[10ch] text-5xl font-bold leading-[0.95] tracking-tight">
                  Snap fresh proof.
                </h2>
                <p className="mt-4 max-w-[28ch] text-sm leading-relaxed text-white/75">
                  Proveit checks that your photo matches your goal, like reading a book or finishing a walk.
                </p>
              </div>
              <div className="min-h-0 flex-1" aria-hidden />
              <div className="shrink-0 pt-3">
                <button
                  type="button"
                  onClick={() => goTo(2)}
                  className="w-full rounded-full bg-prove-500 py-4 text-base font-bold text-white shadow-lg shadow-prove-950/30"
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          {/* Slide 2 – Plants */}
          <section className="relative flex h-full min-h-full w-1/6 shrink-0 flex-col overflow-hidden bg-[#061527]">
            <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-prove-500/35 to-transparent" />
            <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-prove-500/20 blur-3xl" />
            <div className="relative flex h-full min-h-full w-full flex-col px-5 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-white">
              <div className="flex h-10 shrink-0 items-start">
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  className="w-fit rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur-md active:bg-white/25"
                >
                  Back
                </button>
              </div>
              <div className="shrink-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-prove-200">
                  Live garden
                </p>
                <h2 className="mt-3 max-w-[11ch] text-5xl font-bold leading-[0.95] tracking-tight">
                  Grow what you prove.
                </h2>
                <p className="mt-4 max-w-[29ch] text-sm leading-relaxed text-white/75">
                  Hit your proof goal to keep your plant healthy. Miss too much and it wilts.
                </p>
              </div>
              <div className="relative min-h-0 flex-1">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="absolute h-[min(54vh,22rem)] w-[min(84vw,22rem)] rounded-full bg-prove-400/10 blur-3xl" />
                  <img
                    src="/onboarding/plant-growth-transparent.png"
                    alt="Plant growing from a hand"
                    className="relative h-[min(58vh,26rem)] w-[min(92vw,26rem)] object-contain drop-shadow-[0_22px_28px_rgba(16,185,129,0.25)]"
                  />
                </div>
              </div>
              <div className="shrink-0 pt-3">
                <button
                  type="button"
                  onClick={() => goTo(3)}
                  className="w-full rounded-full bg-prove-500 py-4 text-base font-bold text-white shadow-lg shadow-prove-950/30"
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          {/* Slide 3 – Buddies */}
          <section className="relative flex h-full min-h-full w-1/6 shrink-0 flex-col overflow-hidden bg-[#0c1a2e]">
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-sky-500/25 to-transparent" />
            <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-prove-500/15 blur-3xl" />
            <div className="relative flex h-full min-h-full w-full flex-col px-5 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-white">
              <div className="flex h-10 shrink-0 items-start">
                <button
                  type="button"
                  onClick={() => goTo(2)}
                  className="w-fit rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur-md active:bg-white/25"
                >
                  Back
                </button>
              </div>
              <div className="shrink-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                  Buddy goals
                </p>
                <h2 className="mt-3 max-w-[12ch] text-5xl font-bold leading-[0.95] tracking-tight">
                  Prove it together.
                </h2>
                <p className="mt-4 max-w-[30ch] text-sm leading-relaxed text-white/75">
                  Share a goal with a friend, see each other&apos;s progress, and show off a plant profile
                  only your buddies can view.
                </p>
              </div>
              <div className="relative min-h-0 flex-1">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="absolute h-[min(44vh,17rem)] w-[min(90vw,24rem)] rounded-full bg-emerald-400/35 blur-3xl"
                    aria-hidden
                  />
                  <div
                    className="absolute h-[min(38vh,14rem)] w-[min(76vw,20rem)] rounded-full bg-prove-500/30 blur-2xl"
                    aria-hidden
                  />
                  <img
                    src="/onboarding/buddies.png"
                    alt="Two friends cheering each other on"
                    className="relative h-[min(46vh,18rem)] w-auto max-w-[min(96vw,26rem)] object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.35)]"
                  />
                </div>
              </div>
              <div className="shrink-0 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setLoginError("");
                    if (user) {
                      goTo(5);
                      return;
                    }
                    setAuthMode("signup");
                    goTo(4);
                  }}
                  className="w-full rounded-full bg-prove-500 py-4 text-base font-bold text-white shadow-lg shadow-prove-950/30"
                >
                  {user ? "Choose plan" : "Start"}
                </button>
              </div>
            </div>
          </section>

          {/* Slide 4 – Sign in */}
          <section className="flex h-full min-h-full w-1/6 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-white to-prove-50/30 px-4 pt-[env(safe-area-inset-top)] dark:from-slate-950 dark:via-slate-950 dark:to-prove-950/20">
            <div className="flex min-h-0 flex-1 flex-col max-w-sm mx-auto w-full justify-center">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-prove-600 dark:text-prove-400">Step 5 of 6</p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                {authMode === "signin" ? "Sign in" : "Create account"}
              </h2>
              <p className="mt-0.5 text-[14px] text-slate-500 dark:text-slate-400">
                {authMode === "signin" ? "Welcome back." : "Create your account, then choose your plan."}
              </p>
              <div className="mt-4 overflow-y-auto">
                <form onSubmit={handleLoginSubmit} className="space-y-2.5 pb-2">
                  {loginError && (
                    <p className="text-[13px] text-red-500" role="alert">{loginError}</p>
                  )}
                  <div className="overflow-hidden rounded-2xl [&>*]:border-b [&>*]:border-slate-100 dark:[&>*]:border-slate-700/80 last:[&>*]:border-b-0 glass-surface">
                    {authMode === "signup" && (
                      <label className="block">
                        <span className="sr-only">Name or nickname</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-transparent px-3 py-2.5 text-[16px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
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
                        name={authMode === "signup" ? "username" : "username"}
                        autoComplete={authMode === "signup" ? "username" : "username"}
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        className="w-full bg-transparent px-3 py-2.5 text-[16px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
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
                        className="w-full bg-transparent px-3 py-2.5 text-[16px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                        placeholder={authMode === "signup" ? "Password (6+)" : "Password"}
                        required
                      />
                    </label>
                  </div>
                  {useSupabase && authMode === "signin" && (
                    <button type="button" onClick={handleForgotPassword} disabled={loading} className="text-[14px] text-prove-600 dark:text-prove-400">
                      Forgot password?
                    </button>
                  )}
                  {resetFeedback && (
                    <p className="text-[14px] text-prove-600 dark:text-prove-400" role="status">
                      {resetFeedback}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-prove-600 dark:bg-prove-500 py-2.5 text-[15px] font-semibold text-white active:opacity-90 disabled:opacity-70 btn-glass-primary"
                  >
                    {loading ? "Loading…" : authMode === "signin" ? "Sign in" : "Create account"}
                  </button>
                  {authMode === "signup" && (
                    <p className="text-center text-[12px] text-slate-500 dark:text-slate-400">
                      By creating an account you agree to our{" "}
                      <Link href="/privacy" className="text-prove-600 hover:underline dark:text-prove-400">Privacy Policy</Link>
                      {" "}and{" "}
                      <Link href="/terms" className="text-prove-600 hover:underline dark:text-prove-400">Terms of Use</Link>.
                    </p>
                  )}
                  {useSupabase && (
                    <p className="text-center text-[14px] text-slate-500 dark:text-slate-400">
                      {authMode === "signin" ? (
                        <>New?{" "}<button type="button" onClick={() => { setAuthMode("signup"); setLoginError(""); }} className="font-medium text-prove-600 dark:text-prove-400">Create account</button></>
                      ) : (
                        <>Have an account?{" "}<button type="button" onClick={() => { setAuthMode("signin"); setLoginError(""); }} className="font-medium text-prove-600 dark:text-prove-400">Sign in</button></>
                      )}
                    </p>
                  )}
                </form>
              </div>
            </div>
            <div className="mt-2 flex w-full max-w-sm mx-auto shrink-0 items-center justify-between pb-[max(4.5rem,env(safe-area-inset-bottom))] text-[12px] text-slate-500 dark:text-slate-400">
              <button type="button" onClick={() => goTo(2)} className="active:opacity-70">Back</button>
              <span>Plan comes next</span>
            </div>
          </section>

          {/* Slide 5 – Choose plan */}
          <section className="flex h-full min-h-full w-1/6 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-white to-prove-50/30 px-4 pt-[env(safe-area-inset-top)] dark:from-slate-950 dark:via-slate-950 dark:to-prove-950/20">
            <div className="flex w-full max-w-sm mx-auto flex-col min-h-0 flex-1 justify-center">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-prove-600 dark:text-prove-400">Step 6 of 6</p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                Choose your plan
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                Start on Free, or subscribe to Pro or Premium.
              </p>
              <div className="mt-3 space-y-2">
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
                    className={`w-full rounded-2xl border-2 text-left transition active:scale-[0.99] glass-card ${
                      plan.id === "pro"
                        ? "border-prove-400 dark:border-prove-500 shadow-md shadow-prove-600/10 dark:shadow-prove-900/25"
                        : "border-slate-200/85 dark:border-slate-700/65 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {plan.id === "pro" && (
                            <span className="inline-block rounded-full bg-prove-200 dark:bg-prove-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-prove-700 dark:text-prove-300 mb-1.5">
                              Popular
                            </span>
                          )}
                          <p className="text-[16px] font-bold text-slate-900 dark:text-white">{plan.name}</p>
                          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                            {plan.maxGoals === -1 ? "Unlimited" : plan.maxGoals} goal{(plan.maxGoals ?? 0) !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[14px] font-bold ${plan.id === "free" ? "text-slate-700 dark:text-slate-300" : "text-prove-600 dark:text-prove-400"}`}>
                          {plan.id === "free"
                            ? "Free"
                            : `${formatUsd(plan.priceMonthly)}/mo`}
                        </span>
                      </div>
                      <ul className="mt-2 flex flex-col gap-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                        {plan.features.slice(0, 2).map((f, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-prove-500 dark:text-prove-400 shrink-0 mt-0.5" aria-hidden>✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[12px] font-semibold text-prove-600 dark:text-prove-400">
                        {plan.id === "free"
                          ? "Continue with Free →"
                          : `Subscribe to ${plan.name} →`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex w-full max-w-sm mx-auto shrink-0 items-center justify-between pb-[max(4.5rem,env(safe-area-inset-bottom))] text-[12px] text-slate-500 dark:text-slate-400">
              <button type="button" onClick={() => goTo(3)} className="active:opacity-70">Back</button>
              <span>Swipe ← back</span>
            </div>
          </section>
        </div>

        {/* Dots + legal — overlay so slides stay edge-to-edge */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/55 via-black/25 to-transparent pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-10 dark:from-black/70">
          <div
            className="pointer-events-auto flex items-center justify-center gap-[clamp(0.375rem,1.5vw,0.5rem)] px-4 animate-welcome-dots [animation-fill-mode:forwards]"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i as Slide)}
                className={`rounded-full transition-all duration-300 ${
                  slide === i
                    ? "h-[clamp(0.375rem,1.5vmin,0.5rem)] w-[clamp(1rem,4vmin,1.5rem)] bg-prove-400"
                    : "h-[clamp(0.375rem,1.5vmin,0.5rem)] w-[clamp(0.375rem,1.5vmin,0.5rem)] bg-white/40"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <p className="pointer-events-auto mt-2 text-center text-xs text-white/70">
            <Link href="/privacy" className="hover:text-white hover:underline">
              Privacy
            </Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="hover:text-white hover:underline">
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
