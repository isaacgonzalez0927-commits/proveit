"use client";

/**
 * Sharp green abstract logo for Proveit – used in header and loading splash.
 */
export function ProveitLogo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Sharp abstract mark: proof check + bar */}
      <path
        d="M6 22l6-6 4 4 10-12v4L16 22l-4-4-6 6V22z"
        fill="currentColor"
        className="text-prove-600 dark:text-prove-400"
      />
      <path d="M4 26h24v2H4v-2z" fill="currentColor" className="text-prove-500 dark:text-prove-300" />
    </svg>
  );
}
