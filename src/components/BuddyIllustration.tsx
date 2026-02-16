"use client";

/**
 * Custom SVG animal buddy illustrations.
 * Supports cat, dog, rabbit, fox - each grows through 5 stages.
 */

import type { BuddyAnimalId } from "@/lib/buddyAnimals";
import { HatIllustration, AccessoryIllustration } from "./BuddyItemIllustrations";

interface BuddyIllustrationProps {
  animal: BuddyAnimalId;
  stage: "baby" | "toddler" | "growing" | "strong" | "champion";
  className?: string;
  size?: "default" | "large" | "small";
  hatId?: string | null;
  accessoryId?: string | null;
}

export function BuddyIllustration({
  animal,
  stage,
  className = "",
  size = "default",
  hatId,
  accessoryId,
}: BuddyIllustrationProps) {
  const stageSizes = {
    baby: size === "large" ? 120 : size === "small" ? 56 : 80,
    toddler: size === "large" ? 150 : size === "small" ? 68 : 100,
    growing: size === "large" ? 180 : size === "small" ? 80 : 120,
    strong: size === "large" ? 210 : size === "small" ? 92 : 140,
    champion: size === "large" ? 240 : size === "small" ? 104 : 160,
  };
  const baseSize = stageSizes[stage];

  return (
    <div className={`relative inline-flex items-center justify-center max-w-full max-h-full ${className}`}>
      <svg
        viewBox="0 0 120 140"
        className="overflow-visible shrink-0"
        style={{ width: baseSize, height: baseSize * 1.15, maxWidth: "100%", maxHeight: "100%" }}
        aria-hidden
      >
        {/* Champion cape/glow behind buddy */}
        {stage === "champion" && (
          <g transform="translate(60, 75)">
            <path
              d="M -55 5 Q -65 -25 -50 -50 Q -30 -75 0 -65 Q 30 -75 50 -50 Q 65 -25 55 5 Z"
              fill="#f59e0b"
              opacity="0.25"
            />
            <path
              d="M -45 0 Q -52 -20 -40 -38 Q -22 -55 0 -48 Q 22 -55 40 -38 Q 52 -20 45 0 Z"
              fill="#f59e0b"
              opacity="0.15"
            />
          </g>
        )}
        <g transform="translate(60, 75)">
          {animal === "cat" && <CatBuddy stage={stage} />}
          {animal === "dog" && <DogBuddy stage={stage} />}
          {animal === "rabbit" && <RabbitBuddy stage={stage} />}
          {animal === "fox" && <FoxBuddy stage={stage} />}
        </g>
        {hatId && (
          <g transform={`translate(60, ${stage === "baby" ? 30 : stage === "toddler" ? 28 : stage === "growing" ? 27 : stage === "strong" ? 26 : 25})`}>
            <HatIllustration id={hatId as "cap" | "crown" | "grad" | "tophat" | "helmet"} size={baseSize * 0.5} />
          </g>
        )}
        {accessoryId && (
          <g transform={`translate(${accessoryId === "star" ? 72 : 60}, ${accessoryId === "glasses" ? 48 : accessoryId === "bow" ? 54 : 42})`}>
            <AccessoryIllustration
              id={accessoryId as "glasses" | "bow" | "star"}
              size={accessoryId === "glasses" ? baseSize * 0.38 : baseSize * 0.3}
            />
          </g>
        )}
      </svg>
    </div>
  );
}

const FUR = "#8B7355";
const FUR_LIGHT = "#B8956E";
const FUR_DARK = "#5c4537";
const BELLY = "#f5ebe0";
const EYE = "#2d2d2d";
const EYE_WHITE = "#fff";
const HIGHLIGHT = "#fff";

function CatBuddy({ stage }: { stage: string }) {
  const scale = stage === "baby" ? 0.72 : stage === "toddler" ? 0.85 : stage === "growing" ? 0.98 : stage === "strong" ? 1.1 : 1.22;
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <radialGradient id="catBody" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stopColor={FUR_LIGHT} />
          <stop offset="100%" stopColor={FUR} />
        </radialGradient>
        <radialGradient id="catHead" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor={FUR_LIGHT} />
          <stop offset="100%" stopColor={FUR} />
        </radialGradient>
      </defs>
      {/* Body - rounder, chubbier */}
      <ellipse cx={0} cy={38} rx={20} ry={24} fill="url(#catBody)" stroke={FUR_DARK} strokeWidth={0.4} />
      <ellipse cx={0} cy={42} rx={12} ry={9} fill={BELLY} opacity={0.95} />
      {/* Ears */}
      <path d="M -16 -38 L -8 -54 L 2 -38" fill="url(#catHead)" stroke={FUR_DARK} strokeWidth={0.35} strokeLinejoin="round" />
      <path d="M 16 -38 L 8 -54 L -2 -38" fill="url(#catHead)" stroke={FUR_DARK} strokeWidth={0.35} strokeLinejoin="round" />
      {/* Head - closer to body */}
      <circle cx={0} cy={-22} r={22} fill="url(#catHead)" stroke={FUR_DARK} strokeWidth={0.4} />
      {/* Eyes - bigger, cuter */}
      <ellipse cx={-7} cy={-25} rx={5} ry={6} fill={EYE} />
      <ellipse cx={7} cy={-25} rx={5} ry={6} fill={EYE} />
      <circle cx={-5} cy={-24} r={2.2} fill={EYE_WHITE} />
      <circle cx={9} cy={-24} r={2.2} fill={EYE_WHITE} />
      {/* Nose */}
      <path d="M 0 -18 L -1.5 -15 L 0 -13 L 1.5 -15 Z" fill="#d4a08a" stroke="#c4907a" strokeWidth={0.2} />
      {/* Whiskers */}
      <path d="M -18 -22 Q -10 -21 -6 -20 M 18 -22 Q 10 -21 6 -20" stroke={FUR_DARK} strokeWidth={0.3} opacity={0.6} fill="none" />
    </g>
  );
}

function DogBuddy({ stage }: { stage: string }) {
  const scale = stage === "baby" ? 0.72 : stage === "toddler" ? 0.85 : stage === "growing" ? 0.98 : stage === "strong" ? 1.1 : 1.22;
  const fur = "#c9a86c";
  const furLight = "#e8d4a0";
  const dark = "#8b6914";
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <radialGradient id="dogBody" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </radialGradient>
        <radialGradient id="dogHead" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </radialGradient>
      </defs>
      <ellipse cx={0} cy={38} rx={20} ry={24} fill="url(#dogBody)" stroke={dark} strokeWidth={0.4} />
      <ellipse cx={0} cy={42} rx={12} ry={9} fill={BELLY} opacity={0.95} />
      {/* Floppy ears */}
      <ellipse cx={-18} cy={-18} rx={9} ry={14} fill="url(#dogHead)" stroke={dark} strokeWidth={0.35} transform="rotate(-22 -18 -18)" />
      <ellipse cx={18} cy={-18} rx={9} ry={14} fill="url(#dogHead)" stroke={dark} strokeWidth={0.35} transform="rotate(22 18 -18)" />
      <circle cx={0} cy={-22} r={22} fill="url(#dogHead)" stroke={dark} strokeWidth={0.4} />
      <ellipse cx={-7} cy={-25} rx={5} ry={6} fill={EYE} />
      <ellipse cx={7} cy={-25} rx={5} ry={6} fill={EYE} />
      <circle cx={-5} cy={-24} r={2.2} fill={EYE_WHITE} />
      <circle cx={9} cy={-24} r={2.2} fill={EYE_WHITE} />
      <ellipse cx={0} cy={-17} rx={3} ry={2} fill="#a67c52" stroke="#8b6914" strokeWidth={0.2} />
    </g>
  );
}

function RabbitBuddy({ stage }: { stage: string }) {
  const scale = stage === "baby" ? 0.72 : stage === "toddler" ? 0.85 : stage === "growing" ? 0.98 : stage === "strong" ? 1.1 : 1.22;
  const fur = "#e8ddd0";
  const furLight = "#f5efe8";
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <radialGradient id="rabbitBody" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </radialGradient>
        <linearGradient id="rabbitEar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d4c4b0" />
          <stop offset="50%" stopColor={furLight} />
          <stop offset="100%" stopColor="#d4c4b0" />
        </linearGradient>
      </defs>
      <ellipse cx={0} cy={40} rx={19} ry={23} fill="url(#rabbitBody)" stroke="#b8a898" strokeWidth={0.4} />
      <ellipse cx={0} cy={44} rx={11} ry={8} fill="#fdf8f3" opacity={0.95} />
      {/* Long ears */}
      <ellipse cx={-8} cy={-46} rx={5} ry={22} fill="url(#rabbitEar)" stroke="#b8a898" strokeWidth={0.35} />
      <ellipse cx={8} cy={-46} rx={5} ry={22} fill="url(#rabbitEar)" stroke="#b8a898" strokeWidth={0.35} />
      <circle cx={0} cy={-20} r={20} fill="url(#rabbitBody)" stroke="#b8a898" strokeWidth={0.4} />
      <ellipse cx={-7} cy={-23} rx={5} ry={6} fill={EYE} />
      <ellipse cx={7} cy={-23} rx={5} ry={6} fill={EYE} />
      <circle cx={-5} cy={-22} r={2.2} fill={EYE_WHITE} />
      <circle cx={9} cy={-22} r={2.2} fill={EYE_WHITE} />
      <path d="M -2 -14 Q 0 -12 2 -14" stroke="#d4b89c" strokeWidth={0.5} fill="none" strokeLinecap="round" />
    </g>
  );
}

function FoxBuddy({ stage }: { stage: string }) {
  const scale = stage === "baby" ? 0.72 : stage === "toddler" ? 0.85 : stage === "growing" ? 0.98 : stage === "strong" ? 1.1 : 1.22;
  const fur = "#e07838";
  const furLight = "#f0a050";
  const white = "#fef9f5";
  const dark = "#b85c28";
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <radialGradient id="foxBody" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </radialGradient>
        <linearGradient id="foxEar" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </linearGradient>
      </defs>
      <ellipse cx={0} cy={38} rx={20} ry={24} fill="url(#foxBody)" stroke={dark} strokeWidth={0.4} />
      <ellipse cx={0} cy={42} rx={12} ry={9} fill={white} opacity={0.95} />
      {/* Pointy ears */}
      <path d="M -14 -36 L -5 -51 L 3 -36" fill="url(#foxEar)" stroke={dark} strokeWidth={0.35} strokeLinejoin="round" />
      <path d="M 14 -36 L 5 -51 L -3 -36" fill="url(#foxEar)" stroke={dark} strokeWidth={0.35} strokeLinejoin="round" />
      <circle cx={0} cy={-22} r={22} fill="url(#foxBody)" stroke={dark} strokeWidth={0.4} />
      {/* White muzzle stripe */}
      <path d="M -12 -25 Q -6 -22 0 -18 Q 6 -22 12 -25" fill="none" stroke={white} strokeWidth={2} opacity={0.9} strokeLinecap="round" />
      <ellipse cx={-7} cy={-25} rx={5} ry={6} fill={EYE} />
      <ellipse cx={7} cy={-25} rx={5} ry={6} fill={EYE} />
      <circle cx={-5} cy={-24} r={2.2} fill={EYE_WHITE} />
      <circle cx={9} cy={-24} r={2.2} fill={EYE_WHITE} />
      <path d="M 0 -17 L -1.5 -14 L 0 -12 L 1.5 -14 Z" fill="#6b4a3a" stroke="#4a3528" strokeWidth={0.2} />
    </g>
  );
}
