"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  LogOut,
  ChevronDown,
  Sprout,
  UserCircle2,
  SlidersHorizontal,
  Users,
  Settings,
  Plus,
  Images,
  CreditCard,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useHideHeader } from "@/context/HideHeaderContext";
import clsx from "clsx";
import { ThemeToggle } from "./ThemeToggle";
import { StatusStrip } from "./StatusStrip";
import { TOUR_CHANGED_EVENT, TOUR_SPOTLIGHT_KEY } from "@/lib/tourStorage";

/** Cal AI–style tabs: Home / Garden / Settings + floating prove action */
const APP_TABS = [
  { href: "/dashboard", label: "Home", tabLabel: "Home", icon: Home },
  { href: "/buddy", label: "Goal Garden", tabLabel: "Garden", icon: Sprout },
  { href: "/settings", label: "Settings", tabLabel: "Settings", icon: Settings },
] as const;

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Home";
  if (pathname.startsWith("/buddy")) return "Garden";
  if (pathname.startsWith("/goals/history")) return "Progress";
  if (pathname.startsWith("/goals/submit")) return "Prove It";
  if (pathname.startsWith("/goals")) return "Garden";
  if (pathname.startsWith("/achievements")) return "Buddies";
  if (pathname.startsWith("/settings/change-email")) return "Change email";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/friends")) return "Buddies";
  if (pathname.startsWith("/profile")) return "Buddy profile";
  if (pathname.startsWith("/buddy-connect")) return "Connect";
  if (pathname.startsWith("/join")) return "Join goal";
  if (pathname.startsWith("/pricing")) return "Pricing";
  if (pathname.startsWith("/privacy")) return "Privacy";
  if (pathname.startsWith("/terms")) return "Terms";
  if (pathname.startsWith("/support")) return "Support";
  if (pathname.startsWith("/reset-password")) return "Reset Password";
  return "Proveit";
}

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/buddy") return pathname.startsWith("/buddy");
  if (href === "/settings") return pathname.startsWith("/settings");
  return pathname === href;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useApp();
  const [hideHeader] = useHideHeader();
  const [accountOpen, setAccountOpen] = useState(false);
  const [tourSpotlight, setTourSpotlight] = useState<string | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setTourSpotlight(window.localStorage.getItem(TOUR_SPOTLIGHT_KEY));
    sync();
    window.addEventListener(TOUR_CHANGED_EVENT, sync);
    return () => window.removeEventListener(TOUR_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [accountOpen]);

  // Hide the top toolbar until someone is "logged in", on onboarding, or when page requests it (e.g. full-screen camera)
  if (!user || pathname === "/" || hideHeader) {
    return null;
  }

  const showBottomTabs = !pathname.startsWith("/goals/submit");
  const showStatusStrip = showBottomTabs;
  const pageTitle = getPageTitle(pathname);

  const handleSignOut = async () => {
    setAccountOpen(false);
    try {
      await Promise.resolve(signOut());
    } catch {
      // Still route to login so people are never stranded in-app.
    }
    router.push("/");
  };

  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-xl",
          "border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--bg-card)_92%,transparent)]"
        )}
      >
        <div className="mx-auto flex h-[3.25rem] max-w-2xl items-center justify-between gap-3 px-4 sm:h-[3.5rem] sm:px-6">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="truncate rounded-md font-display text-lg font-bold tracking-tight text-[color:var(--text-primary)] transition-opacity hover:opacity-80"
            >
              Proveit
            </Link>
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              {pageTitle}
            </p>
          </div>
          <div className="relative shrink-0" ref={accountRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAccountOpen((o) => !o);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-app)] px-3 text-sm text-[color:var(--text-muted)] transition hover:bg-prove-50 dark:hover:bg-prove-950/40"
              aria-expanded={accountOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <UserCircle2 className="h-4 w-4" />
              <ChevronDown className={clsx("h-4 w-4 transition", accountOpen && "rotate-180")} />
            </button>
            {accountOpen && (
              <div
                className="motion-dropdown absolute right-0 top-full z-[100] mt-2 min-w-[200px] origin-top-right rounded-2xl border border-black/[0.06] bg-white py-2 shadow-soft-lg dark:border-white/10 dark:bg-neutral-900"
                role="menu"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="motion-stagger-grid">
                  <div className="flex items-center justify-between gap-3 px-3 py-2" role="none">
                    <span className="text-xs font-medium text-neutral-500">Theme</span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ThemeToggle />
                    </div>
                  </div>
                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" role="separator" />
                  <Link
                    href="/settings"
                    onClick={() => setAccountOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    role="menuitem"
                    aria-label="Open settings"
                  >
                    <SlidersHorizontal className="h-4 w-4 shrink-0" />
                    Settings
                  </Link>
                  <Link
                    href="/goals/history"
                    onClick={() => setAccountOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    role="menuitem"
                  >
                    <Images className="h-4 w-4 shrink-0" />
                    Progress
                  </Link>
                  <Link
                    href="/pricing"
                    onClick={() => setAccountOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    role="menuitem"
                  >
                    <CreditCard className="h-4 w-4 shrink-0" />
                    Plans
                  </Link>
                  <Link
                    href="/friends"
                    onClick={() => setAccountOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    role="menuitem"
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    Buddies
                  </Link>
                  <Link
                    href="/privacy"
                    onClick={() => setAccountOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    role="menuitem"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/terms"
                    onClick={() => setAccountOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    role="menuitem"
                  >
                    Terms of Use
                  </Link>
                  <Link
                    href="/support"
                    onClick={() => setAccountOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    role="menuitem"
                  >
                    Support
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    role="menuitem"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {showStatusStrip ? <StatusStrip /> : null}
      </header>

      {showBottomTabs && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
          <div className="relative mx-auto w-full max-w-2xl px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <Link
              href="/goals/submit"
              className="fab-prove pointer-events-auto absolute -top-16 right-5 z-10"
              aria-label="Prove it — submit photo proof"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </Link>
            <nav className="pointer-events-auto grid grid-cols-3 gap-0.5 rounded-[1.35rem] border border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--bg-card)_94%,transparent)] p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.08)] backdrop-blur-xl">
              {APP_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = isTabActive(pathname, tab.href);
                const isGardenTab = tab.href === "/buddy";
                const spotlightGarden = tourSpotlight === "garden-tab";
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    data-tour={isGardenTab ? "garden-tab" : undefined}
                    title={tab.label}
                    aria-label={tab.tabLabel === tab.label ? undefined : tab.label}
                    className={clsx(
                      "flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1.5 text-[10px] font-semibold leading-none tracking-tight transition-colors sm:min-h-[52px] sm:px-1 sm:text-[11px]",
                      active
                        ? "bg-prove-100 text-[color:var(--text-primary)] dark:bg-prove-950/60"
                        : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg-app)] hover:text-[color:var(--text-primary)]",
                      isGardenTab && spotlightGarden && "relative z-[100]"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-[20px] w-[20px] shrink-0 sm:h-[18px] sm:w-[18px]" strokeWidth={active ? 2.4 : 1.9} />
                    <span className="max-w-full truncate text-center">{tab.tabLabel}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
