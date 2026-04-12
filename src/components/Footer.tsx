import Link from "next/link";

export function Footer() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-slate-200/80 bg-white/70 py-10 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/50"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight text-prove-700 transition-opacity hover:opacity-90 dark:text-prove-400"
          >
            Proveit
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
            <Link
              href="/"
              className="rounded-md text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Dashboard
            </Link>
            <Link
              href="/buddy"
              className="rounded-md text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Goal Garden
            </Link>
            <Link
              href="/pricing"
              className="rounded-md text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Pricing
            </Link>
            <Link
              href="/privacy"
              className="rounded-md text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="rounded-md text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Terms
            </Link>
            <Link
              href="/support"
              className="rounded-md text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Support
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Set goals. Take a photo. Prove it. © {new Date().getFullYear()} Proveit.
        </p>
      </div>
    </footer>
  );
}
