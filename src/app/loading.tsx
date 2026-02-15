export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-prove-600 dark:border-slate-700 dark:border-t-prove-500"
        aria-hidden
      />
    </div>
  );
}
