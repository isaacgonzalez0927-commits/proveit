import Link from "next/link";
import { Home, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 bg-white dark:bg-black">
      <div className="text-center">
        <p className="text-6xl font-display font-bold text-slate-200 dark:text-slate-800">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
          Page not found
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-prove-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-prove-700"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
