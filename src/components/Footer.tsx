import Link from "next/link";

export function Footer() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-slate-200 bg-slate-50/50 py-8 dark:border-slate-800 dark:bg-slate-950/30"
    >
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight text-prove-700 dark:text-prove-400"
          >
            ProveIt
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Dashboard
            </Link>
            <Link
              href="/goals"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Goals
            </Link>
            <Link
              href="/pricing"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Pricing
            </Link>
            <Link
              href="/privacy"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Terms
            </Link>
          </nav>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Set goals. Take a photo. Prove it. © {new Date().getFullYear()} ProveIt.
        </p>
      </div>
    </footer>
  );
}
