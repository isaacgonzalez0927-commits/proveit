export function LoadingView({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <span className="proveit-mark h-14 w-14 shrink-0" role="img" aria-hidden="true" />
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-prove-600 dark:border-slate-700 dark:border-t-prove-500"
        aria-hidden
      />
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
