"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

interface ShareImageButtonProps {
  label?: string;
  busyLabel?: string;
  onShare: () => Promise<"shared" | "downloaded">;
  onDone?: (result: "shared" | "downloaded") => void;
  onError?: (message: string) => void;
  className?: string;
  compact?: boolean;
}

export function ShareImageButton({
  label = "Share",
  busyLabel = "Creating…",
  onShare,
  onDone,
  onError,
  className = "",
  compact = false,
}: ShareImageButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await onShare();
      onDone?.(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      onError?.(err instanceof Error ? err.message : "Could not share image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={
        className ||
        `inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${
          compact ? "" : "text-sm px-4 py-2.5"
        }`
      }
    >
      <Share2 className="h-3.5 w-3.5" />
      {busy ? busyLabel : label}
    </button>
  );
}
