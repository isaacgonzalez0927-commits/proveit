"use client";

import { useEffect, useState } from "react";
import { PlantIllustration, type PlantStageKey } from "@/components/PlantIllustration";
import type { GoalPlantVariant } from "@/lib/goalPlants";
import { getThemedWateringCanFilter } from "@/lib/wateringCanTheme";

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
  const [wateringLevel, setWateringLevel] = useState(0.2);
  const [burst, setBurst] = useState(false);
  const [active, setActive] = useState(true);
  const [canFilter, setCanFilter] = useState("none");

  useEffect(() => {
    setCanFilter(getThemedWateringCanFilter());
    const burstTimer = window.setTimeout(() => setBurst(true), 180);
    const levelTimer = window.setTimeout(() => setWateringLevel(1), 380);
    const endTimer = window.setTimeout(() => setActive(false), 2200);
    return () => {
      window.clearTimeout(burstTimer);
      window.clearTimeout(levelTimer);
      window.clearTimeout(endTimer);
    };
  }, []);

  return (
    <div
      className={`relative mx-auto h-[168px] w-[188px] ${className}`}
      aria-hidden
    >
      {burst && active && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={`spark-${i}`}
              className="garden-sparkle absolute h-2 w-2 rounded-full bg-emerald-300"
              style={{
                animationDelay: `${0.05 + i * 0.07}s`,
                left: `${20 + i * 11}%`,
                top: `${18 + (i % 3) * 14}%`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={`absolute bottom-0 left-1/2 z-0 -translate-x-1/2 ${active ? "animate-plant-water-bounce" : ""}`}
      >
        <PlantIllustration
          stage={stage}
          wateringLevel={wateringLevel}
          wateredGoals={1}
          variant={variant}
          healthState="healthy"
          size="small"
        />
      </div>

      {active && (
        <div className="pointer-events-none absolute left-[46%] top-[18px] z-20 flex flex-col items-center gap-0.5">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className="water-drop"
              style={{ animationDelay: `${0.22 + i * 0.09}s` }}
            />
          ))}
        </div>
      )}

      {active && (
        <div className="pointer-events-none absolute left-[-6px] top-[-6px] z-10 origin-[72%_88%] animate-watering-can-tilt">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/watering-can.png"
            alt=""
            width={80}
            height={80}
            className="h-[80px] w-[80px] object-contain"
            style={{ filter: canFilter }}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
