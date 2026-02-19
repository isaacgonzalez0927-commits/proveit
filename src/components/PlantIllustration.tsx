"use client";

import { useEffect, useId, useState } from "react";

export type PlantStageKey = "seedling" | "sprout" | "leafy" | "blooming" | "thriving";

interface PlantIllustrationProps {
  stage: PlantStageKey;
  /** 0..1 based on how many due goals are done today */
  wateringLevel: number;
  /** Number of goals completed today (drives droplet count) */
  wateredGoals: number;
  className?: string;
  size?: "default" | "large" | "small";
}

const PHOTO_STAGE_SOURCES: Record<PlantStageKey, string> = {
  seedling: "/plants/plant-stage-1.png",
  sprout: "/plants/plant-stage-2.png",
  leafy: "/plants/plant-stage-3.png",
  blooming: "/plants/plant-stage-4.png",
  thriving: "/plants/plant-stage-5.png",
};
const PHOTO_FLOWERING_SOURCE = "/plants/plant-stage-6.png";

const STAGE_CONFIG: Record<
  PlantStageKey,
  { stemHeight: number; leaves: number; flowers: number; stemCurve: number }
> = {
  seedling: { stemHeight: 24, leaves: 1, flowers: 0, stemCurve: 2 },
  sprout: { stemHeight: 34, leaves: 2, flowers: 0, stemCurve: 3 },
  leafy: { stemHeight: 44, leaves: 4, flowers: 0, stemCurve: 4 },
  blooming: { stemHeight: 52, leaves: 5, flowers: 3, stemCurve: 5 },
  thriving: { stemHeight: 58, leaves: 6, flowers: 5, stemCurve: 6 },
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

export function PlantIllustration({
  stage,
  wateringLevel,
  wateredGoals,
  className = "",
  size = "default",
}: PlantIllustrationProps) {
  const safeWater = clamp(wateringLevel, 0, 1);
  const { stageHeight, stageWidth } = getStageDimensions(size);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoSrc =
    stage === "thriving" && safeWater >= 0.95
      ? PHOTO_FLOWERING_SOURCE
      : PHOTO_STAGE_SOURCES[stage];

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoSrc]);

  if (!photoFailed) {
    const waterDropCount = Math.min(6, Math.max(0, wateredGoals));
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
            filter: `saturate(${0.88 + safeWater * 0.32}) brightness(${0.92 + safeWater * 0.12})`,
          }}
          onError={() => setPhotoFailed(true)}
          loading="eager"
          draggable={false}
        />
        <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
          {[0, 1, 2, 3, 4, 5]
            .slice(0, Math.max(waterDropCount, safeWater > 0 ? 1 : 0))
            .map((n) => (
              <svg
                key={n}
                viewBox="0 0 10 14"
                className="h-3 w-2.5"
                style={{ opacity: 0.25 + safeWater * 0.55 }}
                aria-hidden
              >
                <path
                  d="M5 0 C3.2 2.7 1 5 1 8 A4 4 0 0 0 9 8 C9 5 6.8 2.7 5 0 Z"
                  fill="#38bdf8"
                />
              </svg>
            ))}
        </div>
      </div>
    );
  }

  return (
    <SvgPlantIllustration
      stage={stage}
      wateringLevel={wateringLevel}
      wateredGoals={wateredGoals}
      className={className}
      size={size}
    />
  );
}

function SvgPlantIllustration({
  stage,
  wateringLevel,
  wateredGoals,
  className = "",
  size = "default",
}: PlantIllustrationProps) {
  const safeWater = clamp(wateringLevel, 0, 1);
  const config = STAGE_CONFIG[stage];
  const id = useId();
  const waterDropCount = Math.min(6, Math.max(0, wateredGoals));
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
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id={`stemGrad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id={`potGrad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c26d4f" />
            <stop offset="100%" stopColor="#8a3f2a" />
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

        <g opacity={safeWater > 0 ? 0.4 + safeWater * 0.5 : 0.15}>
          {[0, 1, 2, 3, 4, 5].slice(0, Math.max(waterDropCount, safeWater > 0 ? 1 : 0)).map((n) => {
            const x = 20 + n * 13;
            const y = 22 + (n % 2) * 6;
            return (
              <g key={n} transform={`translate(${x} ${y})`}>
                <path d="M 0 -5 C -3 -1 -2 3 0 5 C 2 3 3 -1 0 -5 Z" fill="#38bdf8" />
              </g>
            );
          })}
        </g>

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
                  <circle r={5.2} fill="#f472b6" opacity={0.96} />
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
