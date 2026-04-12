"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SWIPE_TABS = ["/dashboard", "/buddy", "/goals/history", "/pricing"] as const;

function getTabIndex(pathname: string): number {
  if (pathname.startsWith("/dashboard")) return 0;
  if (pathname.startsWith("/buddy")) return 1;
  if (pathname.startsWith("/goals/history")) return 2;
  if (pathname.startsWith("/pricing")) return 3;
  return -1;
}

/** Don’t treat horizontal drags as tab swipes (e.g. range sliders, text areas). */
function isTouchFromSwipeExemptTarget(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null;
  if (!el) return false;
  if (el.closest('input[type="range"]')) return true;
  if (el.closest("textarea")) return true;
  if (el.closest('[data-prevent-tab-swipe="true"]')) return true;
  return false;
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPath = useRef(pathname);
  const [animClass, setAnimClass] = useState("");
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swiping = useRef(false);

  const goByOffset = (offset: -1 | 1) => {
    const current = getTabIndex(pathname);
    if (current === -1) return;
    const next = current + offset;
    if (next < 0 || next >= SWIPE_TABS.length) return;
    router.push(SWIPE_TABS[next]);
  };

  useEffect(() => {
    if (prevPath.current !== pathname) {
      const prevIdx = getTabIndex(prevPath.current);
      const nextIdx = getTabIndex(pathname);
      prevPath.current = pathname;
      if (prevIdx !== -1 && nextIdx !== -1) {
        setAnimClass(nextIdx > prevIdx ? "animate-tab-slide-left" : "animate-tab-slide-right");
      } else {
        setAnimClass("");
      }
      const t = setTimeout(() => setAnimClass(""), 320);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  return (
    <div
      className={animClass}
      onTouchStart={(event) => {
        if (getTabIndex(pathname) === -1) return;
        if (isTouchFromSwipeExemptTarget(event.target)) return;
        const touch = event.changedTouches[0];
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        swiping.current = false;
      }}
      onTouchMove={(event) => {
        if (touchStartX.current == null || touchStartY.current == null) return;
        const touch = event.changedTouches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX.current);
        const deltaY = Math.abs(touch.clientY - touchStartY.current);
        swiping.current = deltaX > deltaY && deltaX > 20;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current == null || touchStartY.current == null) return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX.current;
        const deltaY = touch.clientY - touchStartY.current;
        const horizontalSwipe = swiping.current && Math.abs(deltaX) > 70 && Math.abs(deltaY) < 60;
        touchStartX.current = null;
        touchStartY.current = null;
        swiping.current = false;
        if (!horizontalSwipe) return;
        if (deltaX < 0) {
          goByOffset(1);
        } else {
          goByOffset(-1);
        }
      }}
    >
      {children}
    </div>
  );
}
