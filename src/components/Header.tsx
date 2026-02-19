"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Camera, LayoutDashboard, CreditCard, History, LogOut, ChevronDown, Sprout } from "lucide-react";
import { useApp } from "@/context/AppContext";
import clsx from "clsx";
import { ThemeToggle } from "./ThemeToggle";

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

  const handleSignOut = () => {
    setAccountOpen(false);
    signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/95 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-display text-xl font-bold tracking-tight text-prove-700 dark:text-prove-400"
        >
          ProveIt
        </Link>
        <nav className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-1 overflow-x-auto overflow-y-hidden py-2 -my-2">
          <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4 shrink-0" />}>
            Dashboard
          </NavLink>
          <NavLink href="/buddy" icon={<Sprout className="h-4 w-4 shrink-0" />}>
            Plant
          </NavLink>
          <NavLink href="/goals" icon={<Camera className="h-4 w-4 shrink-0" />}>
            Goals
          </NavLink>
          <NavLink href="/goals/history" icon={<History className="h-4 w-4 shrink-0" />}>
            History
          </NavLink>
          <NavLink href="/pricing" icon={<CreditCard className="h-4 w-4 shrink-0" />}>
            Pricing
          </NavLink>
        </nav>
        <div className="relative ml-1 shrink-0" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-expanded={accountOpen}
            aria-haspopup="true"
            aria-label="Account menu"
          >
            <span className="hidden sm:inline">Account</span>
            <ChevronDown className={clsx("h-4 w-4 transition", accountOpen && "rotate-180")} />
          </button>
          {accountOpen && (
            <div
              className="absolute right-0 top-full z-[100] mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
              role="menu"
            >
              <div className="flex items-center justify-between gap-3 px-3 py-2" role="none">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Theme</span>
                <ThemeToggle />
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800" />
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
  );
}

function NavLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-prove-100 text-prove-800 dark:bg-prove-900/50 dark:text-prove-300"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
        icon && "gap-2"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
