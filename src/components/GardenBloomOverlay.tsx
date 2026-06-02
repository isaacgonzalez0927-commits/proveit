"use client";

/** Subtle bloom-season sparkles over a plant card. */
export function GardenBloomOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden rounded-2xl" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="garden-bloom-firefly absolute h-1.5 w-1.5 rounded-full bg-amber-200/90 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
          style={{
            left: `${12 + i * 14}%`,
            top: `${20 + (i % 3) * 18}%`,
            animationDelay: `${i * 0.35}s`,
          }}
        />
      ))}
      <span className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-amber-200/25 to-transparent dark:from-amber-400/10" />
    </div>
  );
}
