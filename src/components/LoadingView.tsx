export function LoadingView({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200/90 bg-white/70 px-12 py-10 shadow-soft-lg dark:border-slate-700/80 dark:bg-slate-900/55 dark:shadow-none glass-panel">
        <span className="proveit-mark h-12 w-12 shrink-0 opacity-90" role="img" aria-hidden="true" />
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-prove-600 dark:border-slate-600 dark:border-t-prove-400"
          aria-hidden
        />
        <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );
}
