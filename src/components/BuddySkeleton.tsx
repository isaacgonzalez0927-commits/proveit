"use client";

export function BuddySkeleton() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-5">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl p-4 glass-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
              </div>
              <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="mt-4 flex justify-center">
              <div className="h-20 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
