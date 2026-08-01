import { Sprout } from "lucide-react";
import clsx from "clsx";

/** Compact in-app mark — homescreen/PWA use `/icon.png` / `/apple-icon.png` only. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Sprout
      className={clsx("shrink-0 text-prove-600 dark:text-prove-400", className)}
      strokeWidth={2.4}
      aria-hidden
    />
  );
}
