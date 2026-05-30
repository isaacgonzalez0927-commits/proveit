"use client";

import clsx from "clsx";
import { PlantIllustration } from "@/components/PlantIllustration";
import { buddyProfileAvatarBackgroundStyle } from "@/lib/buddyProfile";
import { CACTUS_VARIANT, type GoalPlantVariant } from "@/lib/goalPlants";
import { DEFAULT_ACCENT_THEME, type AccentTheme } from "@/lib/theme";

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
  accentTheme?: AccentTheme;
  size?: keyof typeof SIZES;
  className?: string;
  ringClassName?: string;
}

/** Circular profile picture — theme fill behind a fully grown plant. */
export function BuddyProfileAvatar({
  variant,
  accentTheme = DEFAULT_ACCENT_THEME,
  size = "lg",
  className,
  ringClassName,
}: BuddyProfileAvatarProps) {
  const s = SIZES[size];

  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-full shadow-lg",
        s.shell,
        ringClassName ?? "ring-4 ring-white/80 dark:ring-slate-900/80",
        className
      )}
      style={buddyProfileAvatarBackgroundStyle(accentTheme)}
    >
      <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/10 via-transparent to-white/15" />
      <div className="relative flex h-full w-full items-end justify-center overflow-hidden rounded-full pb-0.5">
        <PlantIllustration
          stage={profileAvatarPlantStage(variant)}
          wateringLevel={1}
          wateredGoals={1}
          variant={variant}
          className={clsx(s.plant, "max-h-full max-w-full drop-shadow-sm")}
          size={s.illustration}
          playFinalStageAnimation={false}
        />
      </div>
    </div>
  );
}
