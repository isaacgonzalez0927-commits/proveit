"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 480);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  return (
    <div
      className={animate ? "animate-page-enter [animation-fill-mode:backwards]" : ""}
    >
      {children}
    </div>
  );
}
