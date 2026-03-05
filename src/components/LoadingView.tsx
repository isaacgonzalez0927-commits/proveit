import Image from "next/image";

export function LoadingView({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <Image src="/proveit-mark.png" alt="" width={56} height={56} className="shrink-0" />
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-prove-600 dark:border-slate-700 dark:border-t-prove-500"
        aria-hidden
      />
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
