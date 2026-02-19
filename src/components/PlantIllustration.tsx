"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { GoalPlantVariant } from "@/lib/goalPlants";

export type PlantStageKey =
  | "seedling"
  | "sprout"
  | "leafy"
  | "blooming"
  | "thriving"
  | "flowering";

interface PlantIllustrationProps {
  stage: PlantStageKey;
  /** 0..1 based on how many due goals are done today */
  wateringLevel: number;
  /** Number of goals completed today */
  wateredGoals: number;
  /** Optional style variant used across all stages */
  variant?: GoalPlantVariant;
  className?: string;
  size?: "default" | "large" | "small";
}

const STAGE_TO_NUMBER: Record<PlantStageKey, number> = {
  seedling: 1,
  sprout: 2,
  leafy: 3,
  blooming: 4,
  thriving: 5,
  flowering: 6,
};

const STAGE_ALIASES: Record<PlantStageKey, string[]> = {
  seedling: ["seedling", "sprout-1", "baby-plant"],
  sprout: ["sprout", "plant-2", "small-plant"],
  leafy: ["leafy", "plant-3", "mid-plant"],
  blooming: ["blooming", "plant-4", "tall-plant"],
  thriving: ["thriving", "plant-5", "full-plant"],
  flowering: ["flowering", "flowered", "bloom-final", "plant-6", "final-plant"],
};
const IMAGE_EXTENSIONS = ["png", "webp", "jpg", "jpeg"];

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildPhotoCandidates(stage: PlantStageKey, variant: GoalPlantVariant): string[] {
  const stageNumber = STAGE_TO_NUMBER[stage];
  const baseNames =
    stage === "flowering"
      ? [
          `plant-stage-${stageNumber}-${variant}`,
          `plant-stage-${stageNumber}-${variant.toString().padStart(2, "0")}`,
          `plant-stage-${stageNumber}-${variant.toString().padStart(3, "0")}`,
          `stage-${stageNumber}-${variant}`,
          `stage${stageNumber}-${variant}`,
          `plant-${stageNumber}-${variant}`,
          `${stageNumber}-${variant}`,
          `flowering-${variant}`,
          `final-plant-${variant}`,
          `plant-stage-${stageNumber}`,
          `stage-${stageNumber}`,
          `stage${stageNumber}`,
          `plant-${stageNumber}`,
          `plant${stageNumber}`,
          `${stageNumber}`,
          ...STAGE_ALIASES[stage].map((alias) => `${alias}-${variant}`),
          ...STAGE_ALIASES[stage],
        ]
      : [
          `plant-stage-${stageNumber}-${variant}`,
          `stage-${stageNumber}-${variant}`,
          `stage${stageNumber}-${variant}`,
          `plant-${stageNumber}-${variant}`,
          `plant${stageNumber}-${variant}`,
          `${stageNumber}-${variant}`,
          ...STAGE_ALIASES[stage].map((alias) => `${alias}-${variant}`),
          `plant-stage-${stageNumber}`,
          `stage-${stageNumber}`,
          `stage${stageNumber}`,
          `plant-${stageNumber}`,
          `plant${stageNumber}`,
          `${stageNumber}`,
          ...STAGE_ALIASES[stage],
        ];

  const names = unique(baseNames);
  const candidates: string[] = [];
  for (const name of names) {
    for (const ext of IMAGE_EXTENSIONS) {
      candidates.push(`/plants/${name}.${ext}`);
    }
  }
  return candidates;
}

const STAGE_CONFIG: Record<
  PlantStageKey,
  { stemHeight: number; leaves: number; flowers: number; stemCurve: number }
> = {
  seedling: { stemHeight: 24, leaves: 1, flowers: 0, stemCurve: 2 },
  sprout: { stemHeight: 34, leaves: 2, flowers: 0, stemCurve: 3 },
  leafy: { stemHeight: 44, leaves: 4, flowers: 0, stemCurve: 4 },
  blooming: { stemHeight: 52, leaves: 5, flowers: 2, stemCurve: 5 },
  thriving: { stemHeight: 58, leaves: 6, flowers: 3, stemCurve: 6 },
  flowering: { stemHeight: 62, leaves: 6, flowers: 5, stemCurve: 6 },
};

const LEAF_POSITIONS = [
  { side: "left", offset: 12, rotate: -34 },
  { side: "right", offset: 18, rotate: 30 },
  { side: "left", offset: 26, rotate: -26 },
  { side: "right", offset: 32, rotate: 24 },
  { side: "left", offset: 38, rotate: -22 },
  { side: "right", offset: 44, rotate: 20 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getStageDimensions(size: "default" | "large" | "small") {
  const stageHeight = size === "large" ? 250 : size === "small" ? 120 : 170;
  const stageWidth = stageHeight * 0.82;
  return { stageHeight, stageWidth };
}

function getVariantPhotoFilter(variant: GoalPlantVariant, safeWater: number) {
  if (variant === 2) {
    return `hue-rotate(24deg) saturate(${1.02 + safeWater * 0.35}) brightness(${0.92 + safeWater * 0.13})`;
  }
  if (variant === 3) {
    return `hue-rotate(-20deg) saturate(${1.04 + safeWater * 0.38}) brightness(${0.91 + safeWater * 0.14})`;
  }
  return `saturate(${0.88 + safeWater * 0.32}) brightness(${0.92 + safeWater * 0.12})`;
}

function getVariantPalette(variant: GoalPlantVariant) {
  if (variant === 2) {
    return {
      leafStart: "#93c5fd",
      leafEnd: "#2563eb",
      stemStart: "#38bdf8",
      stemEnd: "#0f766e",
      flower: "#c084fc",
      potTop: "#bb7f59",
      potBottom: "#7f3e2a",
    };
  }
  if (variant === 3) {
    return {
      leafStart: "#86efac",
      leafEnd: "#65a30d",
      stemStart: "#4ade80",
      stemEnd: "#3f6212",
      flower: "#fb7185",
      potTop: "#d17a59",
      potBottom: "#944227",
    };
  }
  return {
    leafStart: "#6ee7b7",
    leafEnd: "#22c55e",
    stemStart: "#34d399",
    stemEnd: "#15803d",
    flower: "#f472b6",
    potTop: "#c26d4f",
    potBottom: "#8a3f2a",
  };
}

export function PlantIllustration({
  stage,
  wateringLevel,
  wateredGoals,
  variant = 1,
  className = "",
  size = "default",
}: PlantIllustrationProps) {
  const safeWater = clamp(wateringLevel, 0, 1);
  const { stageHeight, stageWidth } = getStageDimensions(size);
  const photoCandidates = useMemo(() => buildPhotoCandidates(stage, variant), [stage, variant]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoSrc = photoCandidates[photoIndex];

  useEffect(() => {
    setPhotoFailed(false);
    setPhotoIndex(0);
  }, [photoCandidates]);

  if (!photoFailed && photoSrc) {
    return (
      <div
        className={`relative inline-flex items-center justify-center ${className}`}
        style={{ width: stageWidth, height: stageHeight, maxWidth: "100%", maxHeight: "100%" }}
      >
        <img
          src={photoSrc}
          alt=""
          className="h-full w-full select-none object-contain"
          style={{
            filter: getVariantPhotoFilter(variant, safeWater),
          }}
          onError={() => {
            setPhotoIndex((current) => {
              if (current >= photoCandidates.length - 1) {
                setPhotoFailed(true);
                return current;
              }
              return current + 1;
            });
          }}
          loading="eager"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <SvgPlantIllustration
      stage={stage}
      wateringLevel={wateringLevel}
      wateredGoals={wateredGoals}
      variant={variant}
      className={className}
      size={size}
    />
  );
}

function SvgPlantIllustration({
  stage,
  wateringLevel,
  wateredGoals: _wateredGoals,
  variant = 1,
  className = "",
  size = "default",
}: PlantIllustrationProps) {
  const safeWater = clamp(wateringLevel, 0, 1);
  const config = STAGE_CONFIG[stage];
  const palette = getVariantPalette(variant);
  const id = useId();
  const { stageHeight, stageWidth } = getStageDimensions(size);
  const stemBottomY = 114;
  const stemTopY = stemBottomY - config.stemHeight;
  const wetSoilLightness = 31 - safeWater * 12;
  const stemThickness = 2 + safeWater * 0.8;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 140 170"
        className="shrink-0 overflow-visible"
        style={{ width: stageWidth, height: stageHeight, maxWidth: "100%", maxHeight: "100%" }}
        aria-hidden
      >
        <defs>
          <linearGradient id={`leafGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.leafStart} />
            <stop offset="100%" stopColor={palette.leafEnd} />
          </linearGradient>
          <linearGradient id={`stemGrad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.stemStart} />
            <stop offset="100%" stopColor={palette.stemEnd} />
          </linearGradient>
          <linearGradient id={`potGrad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.potTop} />
            <stop offset="100%" stopColor={palette.potBottom} />
          </linearGradient>
          <radialGradient id={`sunGlow-${id}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle
          cx={108}
          cy={30}
          r={28}
          fill={`url(#sunGlow-${id})`}
          opacity={0.2 + safeWater * 0.5}
        />

        <path
          d={`M 70 ${stemBottomY - 4} C ${70 - config.stemCurve} ${stemBottomY - 28}, ${70 + config.stemCurve} ${stemTopY + 14}, 70 ${stemTopY}`}
          fill="none"
          stroke={`url(#stemGrad-${id})`}
          strokeWidth={stemThickness}
          strokeLinecap="round"
        />

        {LEAF_POSITIONS.slice(0, config.leaves).map((leaf, i) => {
          const cx = leaf.side === "left" ? 62 : 78;
          const cy = stemBottomY - leaf.offset;
          return (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={5.5}
              ry={10.5}
              fill={`url(#leafGrad-${id})`}
              transform={`rotate(${leaf.rotate} ${cx} ${cy})`}
            />
          );
        })}

        {config.flowers > 0 && (
          <g>
            {[0, 1, 2, 3, 4].slice(0, config.flowers).map((idx) => {
              const offsets = [
                { x: 0, y: 0 },
                { x: -10, y: 6 },
                { x: 10, y: 5 },
                { x: -16, y: -1 },
                { x: 16, y: -2 },
              ];
              const dot = offsets[idx];
              return (
                <g key={idx} transform={`translate(${70 + dot.x} ${stemTopY - 4 + dot.y})`}>
                  <circle r={5.2} fill={palette.flower} opacity={0.96} />
                  <circle r={2.2} fill="#fde68a" />
                </g>
              );
            })}
          </g>
        )}

        <g>
          <path d="M 34 116 L 106 116 L 96 155 L 44 155 Z" fill={`url(#potGrad-${id})`} />
          <ellipse cx={70} cy={116} rx={37} ry={8.8} fill="#8b5e44" />
          <ellipse
            cx={70}
            cy={116}
            rx={32}
            ry={6.5}
            fill={`hsl(26 42% ${wetSoilLightness}%)`}
          />
          <path
            d="M 44 155 Q 70 163 96 155"
            fill="none"
            stroke="#6b2f1f"
            strokeWidth={1}
            opacity={0.5}
          />
        </g>
      </svg>
    </div>
  );
}
