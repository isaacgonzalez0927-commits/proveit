export function LoadingView({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center px-4">
      <div className="duo-card flex flex-col items-center gap-5 px-12 py-10">
        <p className="font-display text-xl font-black tracking-tight text-prove-600 dark:text-prove-400">
          Proveit
        </p>
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-prove-200 border-t-prove-600 dark:border-prove-900 dark:border-t-prove-400"
          aria-hidden
        />
        <p className="text-center text-sm font-bold text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );
}
