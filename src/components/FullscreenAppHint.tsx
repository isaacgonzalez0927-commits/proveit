"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Maximize2, Share, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useHideHeader } from "@/context/HideHeaderContext";
import {
  canRequestElementFullscreen,
  dismissFullscreenHint,
  isFullscreenHintDismissed,
  isIosSafari,
  isStandaloneDisplay,
  tryBrowserFullscreen,
} from "@/lib/standaloneDisplay";

export function FullscreenAppHint() {
  const pathname = usePathname();
  const { user } = useApp();
  const [hideHeader] = useHideHeader();
  const [hidden, setHidden] = useState(
    () => isFullscreenHintDismissed() || isStandaloneDisplay()
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setHidden(isFullscreenHintDismissed() || isStandaloneDisplay());
  }, []);

  const handleDismiss = useCallback(() => {
    dismissFullscreenHint();
    setHidden(true);
    setSheetOpen(false);
  }, []);

  if (hidden || !user || pathname === "/" || hideHeader || isStandaloneDisplay()) {
    return null;
  }

  const ios = isIosSafari();
  const canFullscreen = canRequestElementFullscreen();

  const handlePrimary = async () => {
    setNotice(null);
    if (canFullscreen && !ios) {
      const ok = await tryBrowserFullscreen();
      if (ok) {
        setNotice("Fullscreen on. Tap the button again to exit.");
        return;
      }
    }
    setSheetOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handlePrimary()}
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-1.5 rounded-full border border-prove-300/80 bg-prove-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-prove-950/25 active:scale-95 dark:border-prove-700 dark:bg-prove-500"
        aria-label="Open app without browser bars"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        Full screen
      </button>

      {notice && !sheetOpen && (
        <p
          className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-30 mx-auto max-w-sm rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-center text-[11px] font-medium text-slate-700 shadow-md dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200"
          role="status"
        >
          {notice}
        </p>
      )}

      {sheetOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fullscreen-hint-title"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="fullscreen-hint-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Hide the browser toolbar
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {ios
                    ? "On iPhone, the reliable way is to add Proveit to your Home Screen — it opens like a real app with no Safari bars."
                    : "Add Proveit to your Home Screen for a full-screen app experience without browser bars."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ol className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {ios ? (
                <>
                  <li className="flex gap-2">
                    <span className="font-semibold text-prove-600 dark:text-prove-400">1.</span>
                    Tap <Share className="mx-0.5 inline h-4 w-4 align-text-bottom" /> Share in Safari
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-prove-600 dark:text-prove-400">2.</span>
                    Scroll and tap <strong>Add to Home Screen</strong>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-prove-600 dark:text-prove-400">3.</span>
                    Open Proveit from your home screen
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-2">
                    <span className="font-semibold text-prove-600 dark:text-prove-400">1.</span>
                    Open the browser menu (⋮ or …)
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-prove-600 dark:text-prove-400">2.</span>
                    Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-prove-600 dark:text-prove-400">3.</span>
                    Launch Proveit from your home screen
                  </li>
                </>
              )}
            </ol>

            <button
              type="button"
              onClick={handleDismiss}
              className="mt-5 w-full rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Don&apos;t show again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
