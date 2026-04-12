"use client";

export function DashboardSkeleton() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>

      <section className="rounded-2xl border border-slate-200/80 p-4 shadow-soft dark:border-slate-700/80 glass-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-5 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="mt-4 flex justify-center gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 w-14 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="mt-3 h-3 w-full max-w-xs animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl p-5 glass-card">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-9 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
        </div>
        <div className="rounded-2xl p-5 glass-card">
          <div className="h-5 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-9 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
        </div>
      </div>

      <div className="mt-6">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <ul className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-center justify-between rounded-xl p-4 glass-card">
              <div className="flex gap-3">
                <div className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                <div>
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
                </div>
              </div>
              <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
