"use client";

interface GardenersNoteProps {
  text: string;
  className?: string;
}

/** AI verification feedback shown as a short “gardener’s note” under the plant. */
export function GardenersNote({ text, className = "" }: GardenersNoteProps) {
  return (
    <div
      className={`mx-3 mb-2 min-w-0 rounded-xl border-2 border-prove-300/80 bg-prove-50/90 px-3 py-2 dark:border-prove-700/50 dark:bg-prove-950/40 sm:mx-4 ${className}`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-prove-800 dark:text-prove-300">
        AI Coach note
      </p>
      <p className="mt-0.5 break-words text-[11px] font-medium leading-snug text-slate-800 dark:text-prove-100/90">
        {text}
      </p>
    </div>
  );
}
