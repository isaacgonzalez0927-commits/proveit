"use client";

interface GardenersNoteProps {
  text: string;
  className?: string;
}

/** AI verification feedback shown as a short “gardener’s note” under the plant. */
export function GardenersNote({ text, className = "" }: GardenersNoteProps) {
  return (
    <div
      className={`mx-3 mb-2 min-w-0 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/35 sm:mx-4 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
        Gardener&apos;s note
      </p>
      <p className="mt-0.5 break-words text-[11px] leading-snug text-emerald-950/90 dark:text-emerald-100/90">
        {text}
      </p>
    </div>
  );
}
