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
          <g transform={`translate(60, ${stage === "baby" ? 18 : stage === "champion" ? -8 : 8})`}>
            <HatIllustration id={hatId as "cap" | "crown" | "grad" | "tophat" | "helmet"} size={baseSize * 0.5} />
          </g>
        )}
      </svg>
      {accessoryId && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2"
          style={{ width: baseSize * 0.45, height: baseSize * 0.45 }}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <AccessoryIllustration id={accessoryId as "glasses" | "bow" | "star"} size={24} />
          </svg>
        </div>
      )}
    </div>
  );
}

const FUR = "#8B7355";
const FUR_LIGHT = "#A08060";
const FUR_DARK = "#6B5344";
const BELLY = "#E8DCC8";
const EYE = "#1a1a1a";
const HIGHLIGHT = "#fff";

function CatBuddy({ stage }: { stage: string }) {
  const scale = stage === "baby" ? 0.7 : stage === "toddler" ? 0.82 : stage === "growing" ? 0.95 : stage === "strong" ? 1.08 : 1.25;
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <radialGradient id="catBody" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={FUR_LIGHT} />
          <stop offset="100%" stopColor={FUR} />
        </radialGradient>
        <radialGradient id="catHead" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={FUR_LIGHT} />
          <stop offset="100%" stopColor={FUR} />
        </radialGradient>
      </defs>
      <ellipse cx={0} cy={35} rx={22} ry={28} fill="url(#catBody)" stroke={FUR_DARK} strokeWidth={0.5} />
      <ellipse cx={0} cy={40} rx={14} ry={10} fill={BELLY} opacity={0.9} />
      <path d="M -18 -44 L -10 -56 L 0 -44" fill="url(#catHead)" stroke={FUR_DARK} strokeWidth={0.5} strokeLinejoin="round" />
      <path d="M 18 -44 L 10 -56 L 0 -44" fill="url(#catHead)" stroke={FUR_DARK} strokeWidth={0.5} strokeLinejoin="round" />
      <circle cx={0} cy={-35} r={24} fill="url(#catHead)" stroke={FUR_DARK} strokeWidth={0.5} />
      <ellipse cx={-8} cy={-38} rx={4.5} ry={5.5} fill={EYE} />
      <ellipse cx={8} cy={-38} rx={4.5} ry={5.5} fill={EYE} />
      <circle cx={-6} cy={-36} r={1.8} fill={HIGHLIGHT} />
      <circle cx={10} cy={-36} r={1.8} fill={HIGHLIGHT} />
      <path d="M 0 -31 L -2 -29 L 0 -27 L 2 -29 Z" fill="#e8a598" stroke="#d49488" strokeWidth={0.3} />
      <path d="M -20 -35 Q -10 -34 -6 -33 M 20 -35 Q 10 -34 6 -33" stroke={FUR_DARK} strokeWidth={0.35} opacity={0.7} fill="none" />
    </g>
  );
}

function DogBuddy({ stage }: { stage: string }) {
  const scale = stage === "baby" ? 0.7 : stage === "toddler" ? 0.82 : stage === "growing" ? 0.95 : stage === "strong" ? 1.08 : 1.25;
  const fur = "#c4a574";
  const furLight = "#e5c890";
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <radialGradient id="dogBody" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </radialGradient>
        <radialGradient id="dogHead" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </radialGradient>
      </defs>
      <ellipse cx={0} cy={35} rx={22} ry={28} fill="url(#dogBody)" stroke={FUR_DARK} strokeWidth={0.5} />
      <ellipse cx={0} cy={42} rx={15} ry={11} fill={BELLY} opacity={0.9} />
      <ellipse cx={-20} cy={-24} rx={11} ry={17} fill="url(#dogHead)" stroke={FUR_DARK} strokeWidth={0.4} transform="rotate(-25 -20 -24)" />
      <ellipse cx={20} cy={-24} rx={11} ry={17} fill="url(#dogHead)" stroke={FUR_DARK} strokeWidth={0.4} transform="rotate(25 20 -24)" />
      <circle cx={0} cy={-35} r={24} fill="url(#dogHead)" stroke={FUR_DARK} strokeWidth={0.5} />
      <ellipse cx={-8} cy={-38} rx={4.5} ry={5.5} fill={EYE} />
      <ellipse cx={8} cy={-38} rx={4.5} ry={5.5} fill={EYE} />
      <circle cx={-6} cy={-36} r={1.8} fill={HIGHLIGHT} />
      <circle cx={10} cy={-36} r={1.8} fill={HIGHLIGHT} />
      <ellipse cx={0} cy={-30} rx={3.5} ry={2.2} fill="#8b6914" stroke="#6b5010" strokeWidth={0.2} />
    </g>
  );
}

function RabbitBuddy({ stage }: { stage: string }) {
  const scale = stage === "baby" ? 0.7 : stage === "toddler" ? 0.82 : stage === "growing" ? 0.95 : stage === "strong" ? 1.08 : 1.25;
  const fur = "#d4c4b0";
  const furLight = "#ebe0d0";
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <radialGradient id="rabbitBody" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </radialGradient>
        <linearGradient id="rabbitEar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={fur} />
          <stop offset="50%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </linearGradient>
      </defs>
      <ellipse cx={0} cy={38} rx={20} ry={26} fill="url(#rabbitBody)" stroke={FUR_DARK} strokeWidth={0.5} />
      <ellipse cx={0} cy={43} rx={13} ry={9} fill="#f5f0e8" opacity={0.95} />
      <ellipse cx={-10} cy={-54} rx={6.5} ry={25} fill="url(#rabbitEar)" stroke={FUR_DARK} strokeWidth={0.4} />
      <ellipse cx={10} cy={-54} rx={6.5} ry={25} fill="url(#rabbitEar)" stroke={FUR_DARK} strokeWidth={0.4} />
      <circle cx={0} cy={-32} r={22} fill="url(#rabbitBody)" stroke={FUR_DARK} strokeWidth={0.5} />
      <ellipse cx={-8} cy={-35} rx={4.5} ry={5.5} fill={EYE} />
      <ellipse cx={8} cy={-35} rx={4.5} ry={5.5} fill={EYE} />
      <circle cx={-6} cy={-33} r={1.8} fill={HIGHLIGHT} />
      <circle cx={10} cy={-33} r={1.8} fill={HIGHLIGHT} />
      <path d="M -2 -27 Q 0 -25 2 -27" stroke="#c4a574" strokeWidth={0.6} fill="none" strokeLinecap="round" />
    </g>
  );
}

function FoxBuddy({ stage }: { stage: string }) {
  const scale = stage === "baby" ? 0.7 : stage === "toddler" ? 0.82 : stage === "growing" ? 0.95 : stage === "strong" ? 1.08 : 1.25;
  const fur = "#e07c3c";
  const furLight = "#f0a050";
  const white = "#fef7ed";
  const dark = "#c45c2c";
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <radialGradient id="foxBody" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </radialGradient>
        <linearGradient id="foxEar" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={furLight} />
          <stop offset="100%" stopColor={fur} />
        </linearGradient>
      </defs>
      <ellipse cx={0} cy={35} rx={22} ry={28} fill="url(#foxBody)" stroke={dark} strokeWidth={0.5} />
      <ellipse cx={0} cy={42} rx={14} ry={9} fill={white} opacity={0.95} />
      <path d="M -17 -41 L -6 -58 L 4 -41" fill="url(#foxEar)" stroke={dark} strokeWidth={0.4} strokeLinejoin="round" />
      <path d="M 17 -41 L 6 -58 L -4 -41" fill="url(#foxEar)" stroke={dark} strokeWidth={0.4} strokeLinejoin="round" />
      <circle cx={0} cy={-35} r={24} fill="url(#foxBody)" stroke={dark} strokeWidth={0.5} />
      <path d="M -14 -39 Q -7 -35 0 -32 Q 7 -35 14 -39" fill="none" stroke={white} strokeWidth={1.8} opacity={0.9} strokeLinecap="round" />
      <ellipse cx={-8} cy={-38} rx={4.5} ry={5.5} fill={EYE} />
      <ellipse cx={8} cy={-38} rx={4.5} ry={5.5} fill={EYE} />
      <circle cx={-6} cy={-36} r={1.8} fill={HIGHLIGHT} />
      <circle cx={10} cy={-36} r={1.8} fill={HIGHLIGHT} />
      <path d="M 0 -28 L -2 -25 L 0 -23 L 2 -25 Z" fill="#5c4033" stroke="#3d2a20" strokeWidth={0.2} />
    </g>
  );
}
