"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const PULL_THRESHOLD = 70;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pullY, setPullY] = useState(0);
  const startYRef = useRef(0);
  const pullYRef = useRef(0);
  pullYRef.current = pullY;

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 15) return;
    startYRef.current = e.touches[0].clientY;
    setPullY(0);
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === 0) return;
    const y = e.touches[0].clientY;
    const delta = y - startYRef.current;
    if (delta > 0 && window.scrollY < 15) {
      setPullY(Math.min(delta * 0.5, 90));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pullYRef.current >= PULL_THRESHOLD) {
      router.refresh();
    }
    setPullY(0);
    startYRef.current = 0;
  }, [router]);

  useEffect(() => {
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return (
    <>
      {pullY > 0 && (
        <div
          className="fixed left-0 right-0 top-0 z-30 flex justify-center pt-2 transition-opacity"
          style={{
            transform: `translateY(${Math.min(pullY, 60)}px)`,
            opacity: Math.min(pullY / 50, 1),
          }}
        >
          <span className="rounded-full bg-slate-200/90 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-700/90 dark:text-slate-300">
            {pullY >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      )}
      {children}
    </>
  );
}
