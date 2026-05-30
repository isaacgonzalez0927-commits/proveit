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
  sm: { shell: "h-14 w-14", plant: "h-11 w-11", illustration: "small" as const },
  md: { shell: "h-[4.5rem] w-[4.5rem]", plant: "h-[3.6rem] w-[3.6rem]", illustration: "small" as const },
  lg: { shell: "h-[7.5rem] w-[7.5rem]", plant: "h-[5.75rem] w-[5.75rem]", illustration: "large" as const },
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
        "relative shrink-0 overflow-hidden rounded-full shadow-md shadow-slate-900/15 dark:shadow-black/40",
        s.shell,
        ringClassName ?? "ring-[3px] ring-white/90 dark:ring-slate-800/90",
        className
      )}
      style={buddyProfileAvatarBackgroundStyle(accentTheme)}
    >
      <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/20 via-transparent to-white/20" />
      <div className="relative flex h-full w-full items-end justify-center overflow-hidden rounded-full pb-1">
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
