"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { PLANS, type PlanId } from "@/types";

type Slide = 0 | 1 | 2; // 0 = welcome, 1 = login, 2 = plan
type AuthMode = "signin" | "signup";

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authReady, hasSelectedPlan, setUser, setPlan, useSupabase, supabase } = useApp();

  const [slide, setSlide] = useState<Slide>(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const requestedStep = searchParams.get("step");
  const authError = searchParams.get("error");
  const [sessionSettled, setSessionSettled] = useState(false);
  const welcomeDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authError === "auth") {
      setSessionSettled(true);
      setSlide(1);
      setLoginError("Sign-in failed. Try again or use email and password.");
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
        router.replace("/dashboard");
        return;
      }
      setSlide(2);
      return;
    }

    if (requestedStep === "plan") {
      setSessionSettled(true);
      setSlide(2);
      return;
    }
    if (requestedStep === "login") {
      setSessionSettled(true);
      setSlide(1);
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
  }, [authReady, user, hasSelectedPlan, requestedStep, router, sessionSettled]);

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
    } else if (delta < -threshold && slide < 2) {
      setSlide((prev) => (prev + 1) as Slide);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (authMode === "signup" && !trimmedName) {
      setLoginError("Please enter your name or nickname.");
      return;
    }
    if (!trimmedEmail) {
      setLoginError("Please enter your email.");
      return;
    }
    if (password.length < 6) {
      setLoginError("Password must be at least 6 characters.");
      return;
    }
    setLoginError("");
    setResetSent(false);

    if (useSupabase && supabase) {
      setLoading(true);
      try {
        if (authMode === "signin") {
          const { error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          });
          if (error) {
            setLoginError(error.message === "Invalid login credentials" ? "Invalid email or password." : error.message);
            return;
          }
        } else {
          const { data, error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback` : undefined },
          });
          if (error) {
            setLoginError(error.message);
            return;
          }
          if (data?.user && !data?.session) {
            setLoginError("Check your email to confirm your account, then sign in.");
            return;
          }
          setLoginError("");
          if (typeof window !== "undefined") {
            window.localStorage.setItem("proveit_display_name", trimmedName);
          }
          setSlide(2);
          return;
        }
        setSlide(2);
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
      const now = new Date().toISOString();
      setUser({
        id: user?.id ?? `user-${Date.now()}`,
        email: trimmedEmail,
        plan: user?.plan ?? "free",
        createdAt: user?.createdAt ?? now,
        name: trimmedName || user?.name,
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("proveit_display_name", trimmedName || user?.name || "");
      }
      setLoginError("");
      setSlide(2);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLoginError("Enter your email first.");
      return;
    }
    if (!useSupabase || !supabase) return;
    setLoading(true);
    setLoginError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback?next=/reset-password` : undefined,
      });
      if (error) {
        setLoginError(error.message);
        return;
      }
      setResetSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    if (!useSupabase || !supabase) {
      setLoginError("Sign-in with Google isn’t available. Check your environment setup.");
      return;
    }
    setLoading(true);
    setLoginError("");
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/auth/callback`
          : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) {
        setLoginError(error.message);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setLoginError(
        "Google sign-in didn’t return a link. In Supabase Dashboard: enable the Google provider and add your Google Client ID and Secret. In Google Cloud, add redirect URI: https://yzxokiqggwpaovggwnsn.supabase.co/auth/v1/callback"
      );
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleChoosePlan = useCallback(
    async (planId: PlanId) => {
      await setPlan(planId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("proveit_start_tour", "1");
        window.localStorage.removeItem("proveit_tour_done");
      }
      router.push("/dashboard");
    },
    [router, setPlan]
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
    <main className="fixed inset-0 flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-white to-prove-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-prove-950/20">
      {/* Decorative background shapes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-prove-200/40 blur-3xl dark:bg-prove-900/30" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-prove-100/50 blur-3xl dark:bg-prove-900/20" />
        <div className="absolute right-1/3 top-1/4 h-40 w-40 rounded-full bg-prove-300/20 blur-2xl dark:bg-prove-800/20" />
      </div>
      <div
        className="relative z-10 flex flex-1 flex-col overflow-hidden"
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
          className="flex min-h-0 flex-1 w-[300%] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${slide * (100 / 3)}%)` }}
        >
          {/* Slide 0 – Welcome – full-screen hero */}
          <section className="flex h-full w-1/3 shrink-0 flex-col overflow-hidden px-[clamp(1rem,5vw,3rem)] pt-[max(1rem,env(safe-area-inset-top))] pb-[clamp(0.75rem,2vh,1.5rem)]">
            <div className="flex w-full flex-1 flex-col items-center justify-center text-center">
              <div
                className="inline-flex w-fit items-center gap-2 rounded-full bg-prove-100 px-[clamp(0.875rem,3vw,1.5rem)] py-[clamp(0.35rem,1.25vh,0.6rem)] animate-welcome-step [animation-fill-mode:forwards] dark:bg-prove-900/50"
              >
                <span className="h-[clamp(0.3rem,1.75vw,0.6rem)] w-[clamp(0.3rem,1.75vw,0.6rem)] rounded-full bg-prove-500" />
                <p className="text-[clamp(0.75rem,2.25vw,1rem)] font-semibold uppercase tracking-wider text-prove-700 dark:text-prove-300">
                  Step 1 of 3
                </p>
              </div>
              <h1
                className="mt-[clamp(0.5rem,2vh,1rem)] max-w-[14ch] font-display text-[clamp(3.5rem,16vmin,9rem)] font-bold leading-[1.02] tracking-tight text-slate-900 animate-welcome-headline [animation-fill-mode:forwards] dark:text-white"
              >
                Prove your
                <br />
                <span className="text-prove-600 dark:text-prove-400">habits</span> with
                <br />
                photos.
              </h1>
              <div
                className="mt-[clamp(0.75rem,3vh,1.5rem)] w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white/60 p-[clamp(1rem,4vw,1.5rem)] backdrop-blur-sm animate-welcome-list [animation-fill-mode:forwards] dark:border-slate-700/50 dark:bg-slate-900/40"
              >
                <ol className="space-y-[clamp(0.5rem,2vh,1rem)] text-left text-[clamp(1rem,3.5vmin,1.5rem)] leading-snug text-slate-600 dark:text-slate-400">
                  <li className="flex gap-4">
                    <span className="flex h-[clamp(1.5rem,5vmin,2.25rem)] w-[clamp(1.5rem,5vmin,2.25rem)] shrink-0 items-center justify-center rounded-full bg-prove-100 text-[clamp(0.75rem,2.5vmin,1rem)] font-bold text-prove-700 dark:bg-prove-900/80 dark:text-prove-300">1</span>
                    Set a daily or weekly goal, reminder time, and plant style.
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-[clamp(1.5rem,5vmin,2.25rem)] w-[clamp(1.5rem,5vmin,2.25rem)] shrink-0 items-center justify-center rounded-full bg-prove-100 text-[clamp(0.75rem,2.5vmin,1rem)] font-bold text-prove-700 dark:bg-prove-900/80 dark:text-prove-300">2</span>
                    Get a notification on your phone.
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-[clamp(1.5rem,5vmin,2.25rem)] w-[clamp(1.5rem,5vmin,2.25rem)] shrink-0 items-center justify-center rounded-full bg-prove-100 text-[clamp(0.75rem,2.5vmin,1rem)] font-bold text-prove-700 dark:bg-prove-900/80 dark:text-prove-300">3</span>
                    Take a photo before midnight to keep your streak.
                  </li>
              </ol>
              </div>
            </div>
            <div className="mt-[clamp(0.75rem,3vh,1.5rem)] flex w-full items-center justify-between animate-welcome-cta [animation-fill-mode:forwards]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signin");
                    setLoginError("");
                    goTo(1);
                  }}
                  className="rounded-full border border-slate-300 px-3 py-[clamp(0.4rem,1.8vh,0.7rem)] text-[clamp(0.8rem,2.4vmin,1rem)] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900/60"
                >
                  I already have an account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setLoginError("");
                    goTo(1);
                  }}
                  className="rounded-full bg-prove-600 px-[clamp(1.25rem,4.5vw,1.75rem)] py-[clamp(0.6rem,2.5vh,0.9rem)] text-[clamp(0.9375rem,2.75vmin,1.125rem)] font-semibold text-white shadow-lg shadow-prove-600/25 transition hover:bg-prove-700 dark:bg-prove-500 dark:shadow-prove-500/20 dark:hover:bg-prove-400"
                >
                  Get started
                </button>
              </div>
            </div>
          </section>

          {/* Slide 1 – Sign in: form centered in the screen */}
          <section className="flex h-full w-1/3 shrink-0 flex-col overflow-hidden px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
            <div className="flex min-h-0 flex-1 flex-col max-w-sm mx-auto w-full justify-center">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-prove-600 dark:text-prove-400">Step 2 of 3</p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                {authMode === "signin" ? "Sign in" : "Create account"}
              </h2>
              <p className="mt-0.5 text-[14px] text-slate-500 dark:text-slate-400">
                {authMode === "signin" ? "Welcome back." : "Free to start."}
              </p>
              <div className="mt-4 overflow-y-auto">
                <form onSubmit={handleLoginSubmit} className="space-y-2.5 pb-2">
                  <div>
                    <button
                      type="button"
                      onClick={() => useSupabase && handleOAuthSignIn("google")}
                      disabled={loading || !useSupabase}
                      className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white dark:bg-slate-800/80 py-2.5 text-[15px] font-medium text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 active:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      {loading ? "Loading…" : authMode === "signup" ? "Create account with Google" : "Continue with Google"}
                    </button>
                    {loginError && (
                      <p className="mt-2 text-[13px] text-red-500" role="alert">{loginError}</p>
                    )}
                  </div>
                  {useSupabase && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-[12px] text-slate-400 dark:text-slate-500">or</span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    </div>
                  )}
                  <div className="rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 [&>*]:border-b [&>*]:border-slate-100 dark:[&>*]:border-slate-700/80 last:[&>*]:border-b-0">
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
                      <span className="sr-only">Email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-transparent px-3 py-2.5 text-[16px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                        placeholder="Email"
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
                  {resetSent && <p className="text-[14px] text-prove-600 dark:text-prove-400" role="status">Check your email.</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-prove-600 dark:bg-prove-500 py-2.5 text-[15px] font-semibold text-white active:opacity-90 disabled:opacity-70"
                  >
                    {loading ? "Loading…" : authMode === "signin" ? "Sign in" : "Create account"}
                  </button>
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
            <div className="mt-2 flex w-full max-w-sm mx-auto items-center justify-between text-[12px] text-slate-500 dark:text-slate-400 shrink-0">
              <button type="button" onClick={() => goTo(0)} className="active:opacity-70">Back</button>
              <span>Swipe → plan</span>
            </div>
          </section>

          {/* Slide 2 – Choose plan: clean, appetizing cards */}
          <section className="flex h-full w-1/3 shrink-0 flex-col overflow-hidden px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
            <div className="flex w-full max-w-sm mx-auto flex-col min-h-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-prove-600 dark:text-prove-400">Step 3 of 3</p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                Choose your plan
              </h2>
              <p className="mt-0.5 text-[14px] text-slate-500 dark:text-slate-400">
                Start free — no card required. Upgrade whenever you’re ready.
              </p>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto space-y-3 pb-2">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleChoosePlan(plan.id as PlanId)}
                    className={`w-full rounded-2xl border-2 text-left transition active:scale-[0.99] ${
                      plan.id === "free"
                        ? "border-prove-400 dark:border-prove-500 bg-prove-50/80 dark:bg-prove-950/40 shadow-sm shadow-prove-200/50 dark:shadow-prove-900/30"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="px-4 pt-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {plan.id === "free" && (
                            <span className="inline-block rounded-full bg-prove-200 dark:bg-prove-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-prove-700 dark:text-prove-300 mb-1.5">
                              Recommended to start
                            </span>
                          )}
                          <p className="text-[17px] font-bold text-slate-900 dark:text-white">{plan.name}</p>
                          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                            {plan.dailyGoals === -1 ? "Unlimited" : plan.dailyGoals} daily · {plan.weeklyGoals === -1 ? "Unlimited" : plan.weeklyGoals} weekly goals
                          </p>
                        </div>
                        <span className={`text-[16px] font-bold shrink-0 ${plan.id === "free" ? "text-prove-600 dark:text-prove-400" : "text-slate-700 dark:text-slate-300"}`}>
                          {plan.priceMonthly === 0 ? "Free" : `£${plan.priceMonthly}/mo`}
                        </span>
                      </div>
                      <ul className="mt-3 flex flex-col gap-1.5 text-[12px] text-slate-600 dark:text-slate-400">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-prove-500 dark:text-prove-400 shrink-0 mt-0.5" aria-hidden>✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-[13px] font-semibold text-prove-600 dark:text-prove-400">
                        {plan.id === "free" ? "Get started free →" : `Choose ${plan.name} →`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex w-full max-w-sm mx-auto items-center justify-between text-[12px] text-slate-500 dark:text-slate-400 shrink-0">
              <button type="button" onClick={() => goTo(1)} className="active:opacity-70">Back</button>
              <span>Swipe ← back</span>
            </div>
          </section>
        </div>
        {/* Dots indicator */}
        <div
          className="flex shrink-0 items-center justify-center gap-[clamp(0.375rem,1.5vw,0.5rem)] px-4 py-[clamp(0.375rem,1.5vh,0.5rem)] pb-[max(0.5rem,env(safe-area-inset-bottom))] animate-welcome-dots [animation-fill-mode:forwards]"
        >
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i as Slide)}
              className={`rounded-full transition-all duration-300 ${
                slide === i
                  ? "h-[clamp(0.375rem,1.5vmin,0.5rem)] w-[clamp(1rem,4vmin,1.5rem)] bg-prove-600 dark:bg-prove-400"
                  : "h-[clamp(0.375rem,1.5vmin,0.5rem)] w-[clamp(0.375rem,1.5vmin,0.5rem)] bg-slate-300 dark:bg-slate-600"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-slate-500 dark:text-slate-400">
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return <LandingContent />;
}
