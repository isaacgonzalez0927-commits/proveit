"use client";

import { useEffect, useState } from "react";
import { PlantIllustration, type PlantStageKey } from "@/components/PlantIllustration";
import type { GoalPlantVariant } from "@/lib/goalPlants";

interface PlantWateringCelebrationProps {
  stage: PlantStageKey;
  variant: GoalPlantVariant;
  className?: string;
}

export function PlantWateringCelebration({
  stage,
  variant,
  className = "",
}: PlantWateringCelebrationProps) {
  const [wateringLevel, setWateringLevel] = useState(0.35);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const levelTimer = window.setTimeout(() => setWateringLevel(1), 420);
    const endTimer = window.setTimeout(() => setActive(false), 1500);
    return () => {
      window.clearTimeout(levelTimer);
      window.clearTimeout(endTimer);
    };
  }, []);

  return (
    <div
      className={`relative mx-auto h-[148px] w-[168px] ${className}`}
      aria-hidden
    >
      <div
        className={`absolute bottom-0 left-1/2 z-0 -translate-x-1/2 ${active ? "animate-plant-water-bounce" : ""}`}
      >
        <PlantIllustration
          stage={stage}
          wateringLevel={wateringLevel}
          wateredGoals={1}
          variant={variant}
          size="small"
        />
      </div>

      {active && (
        <div className="pointer-events-none absolute left-[46%] top-[22px] z-20 flex flex-col items-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="water-drop"
              style={{ animationDelay: `${0.32 + i * 0.12}s` }}
            />
          ))}
        </div>
      )}

      <div
        className={`pointer-events-none absolute left-[-6px] top-[-2px] z-10 origin-[72%_88%] ${
          active ? "animate-watering-can-tilt" : "opacity-0"
        }`}
      >
        <div className="h-[72px] w-[72px] drop-shadow-md watering-can-themed" />
      </div>
    </div>
  );
}
