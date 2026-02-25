"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Images,
  LogOut,
  ChevronDown,
  Sprout,
  UserCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import clsx from "clsx";
import { ThemeToggle } from "./ThemeToggle";

const APP_TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/buddy", label: "Goal Garden", icon: Sprout },
  { href: "/goals/history", label: "Gallery", icon: Images },
  { href: "/pricing", label: "Plan", icon: CreditCard },
] as const;

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/buddy")) return "Goal Garden";
  if (pathname.startsWith("/goals/history")) return "Gallery";
  if (pathname.startsWith("/goals/submit")) return "Prove It";
  if (pathname.startsWith("/goals")) return "Goal Garden";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/pricing")) return "Pricing";
  if (pathname.startsWith("/privacy")) return "Privacy";
  if (pathname.startsWith("/terms")) return "Terms";
  if (pathname.startsWith("/reset-password")) return "Reset Password";
  return "Proveit";
}

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/buddy") return pathname.startsWith("/buddy");
  if (href === "/goals/history") return pathname.startsWith("/goals/history");
  if (href === "/pricing") return pathname.startsWith("/pricing");
  return pathname === href;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useApp();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

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

  // Hide the top toolbar until someone is "logged in" and never show it on the onboarding screen
  if (!user || pathname === "/") {
    return null;
  }

  const showBottomTabs = !pathname.startsWith("/goals/submit");
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
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="block truncate font-display text-lg font-bold tracking-tight text-prove-700 dark:text-prove-400"
            >
              Proveit
            </Link>
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
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
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-expanded={accountOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <UserCircle2 className="h-4 w-4" />
              <ChevronDown className={clsx("h-4 w-4 transition", accountOpen && "rotate-180")} />
            </button>
            {accountOpen && (
              <div
                className="absolute right-0 top-full z-[100] mt-2 min-w-[190px] rounded-2xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                role="menu"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 px-3 py-2" role="none">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Theme</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ThemeToggle />
                  </div>
                </div>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <Link
                  href="/settings"
                  onClick={() => setAccountOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  role="menuitem"
                  aria-label="Open settings"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" />
                  Settings
                </Link>
                <Link
                  href="/privacy"
                  onClick={() => setAccountOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  role="menuitem"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  onClick={() => setAccountOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  role="menuitem"
                >
                  Terms of Use
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  role="menuitem"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showBottomTabs && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto w-full max-w-2xl px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <nav className="pointer-events-auto grid grid-cols-4 rounded-2xl border border-slate-200/80 bg-white/95 p-1 shadow-[0_10px_30px_rgba(15,23,42,0.15)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/95 dark:shadow-[0_10px_30px_rgba(2,6,23,0.5)]">
              {APP_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = isTabActive(pathname, tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={clsx(
                      "flex min-h-[56px] flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-colors",
                      active
                        ? "bg-prove-100 text-prove-800 dark:bg-prove-900/50 dark:text-prove-300"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="mt-1 leading-none">{tab.label}</span>
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
