"use client";

/**
 * Faded sprout SVG silhouette for empty states – invites the user to plant something.
 */
export function SproutSilhouette({ className }: { className?: string }) {
  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 64 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M32 76V44c0-8 6-14 14-22 2-2 4-6 4-10 0-4-2-8-6-10-2-2-6-2-8 0-4 2-6 6-6 10 0 4 2 8 4 10 8 8 14 14 14 22v32"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-prove-300 dark:text-prove-800"
      />
      <path
        d="M32 44c-8 0-14-6-14-14 0-4 2-8 6-10 4-2 8-2 8 0 4 2 6 6 6 10 0 8-6 14-14 14v0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-prove-300 dark:text-prove-800"
      />
    </svg>
  );
}
