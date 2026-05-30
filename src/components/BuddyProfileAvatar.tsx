"use client";

import clsx from "clsx";
import { PlantIllustration } from "@/components/PlantIllustration";
import { CACTUS_VARIANT, type GoalPlantVariant } from "@/lib/goalPlants";

/** Final growth stage for profile avatars (cactus tops out at thriving). */
export function profileAvatarPlantStage(variant: GoalPlantVariant): "thriving" | "flowering" {
  return variant === CACTUS_VARIANT ? "thriving" : "flowering";
}

const SIZES = {
  sm: { shell: "h-12 w-12", plant: "h-10 w-10", illustration: "small" as const },
  md: { shell: "h-16 w-16", plant: "h-14 w-14", illustration: "small" as const },
  lg: { shell: "h-28 w-28", plant: "h-[6.5rem] w-[6.5rem]", illustration: "large" as const },
};

interface BuddyProfileAvatarProps {
  variant: GoalPlantVariant;
  size?: keyof typeof SIZES;
  className?: string;
  ringClassName?: string;
}

/** Circular profile picture — fully grown plant, clipped to a circle. */
export function BuddyProfileAvatar({
  variant,
  size = "lg",
  className,
  ringClassName,
}: BuddyProfileAvatarProps) {
  const s = SIZES[size];

  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-full bg-white shadow-lg dark:bg-slate-900",
        s.shell,
        ringClassName ?? "ring-4 ring-white/90 dark:ring-slate-800/90",
        className
      )}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
        <PlantIllustration
          stage={profileAvatarPlantStage(variant)}
          wateringLevel={1}
          wateredGoals={1}
          variant={variant}
          className={clsx(s.plant, "max-h-full max-w-full")}
          size={s.illustration}
          playFinalStageAnimation={false}
        />
      </div>
    </div>
  );
}
