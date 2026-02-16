"use client";

/**
 * Custom SVG illustrations for the buddy at each growth stage.
 * Baby → Toddler → Growing → Strong → Champion
 */

interface BuddyIllustrationProps {
  stage: "baby" | "toddler" | "growing" | "strong" | "champion";
  className?: string;
  /** "default" for dashboard card, "large" for Buddy page */
  size?: "default" | "large";
  /** Hat emoji to overlay (from customization) */
  hatEmoji?: string;
  /** Accessory emoji to overlay */
  accessoryEmoji?: string;
}

export function BuddyIllustration({
  stage,
  className = "",
  size = "default",
  hatEmoji,
  accessoryEmoji,
}: BuddyIllustrationProps) {
  const stageSizes = {
    baby: size === "large" ? 96 : 56,
    toddler: size === "large" ? 112 : 72,
    growing: size === "large" ? 128 : 88,
    strong: size === "large" ? 144 : 104,
    champion: size === "large" ? 160 : 120,
  };
  const baseSize = stageSizes[stage];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 120 140"
        className="overflow-visible"
        style={{ width: baseSize, height: baseSize * 1.15 }}
        aria-hidden
      >
        {stage === "baby" && <BabyBuddy />}
        {stage === "toddler" && <ToddlerBuddy />}
        {stage === "growing" && <GrowingBuddy />}
        {stage === "strong" && <StrongBuddy />}
        {stage === "champion" && <ChampionBuddy />}
      </svg>
      {hatEmoji && (
        <span
          className="absolute left-1/2 -translate-x-1/2 text-xl sm:text-2xl -top-1"
          aria-hidden
        >
          {hatEmoji}
        </span>
      )}
      {accessoryEmoji && (
        <span
          className="absolute right-0 top-1/2 -translate-y-1/2 text-base sm:text-lg"
          aria-hidden
        >
          {accessoryEmoji}
        </span>
      )}
    </div>
  );
}

const SKIN = "#f5d0b0";
const SKIN_DARK = "#e8b896";
const BODY = "#8b7355";
const BODY_LIGHT = "#a08060";
const ACCENT = "#f59e0b";
const ACCENT_DARK = "#d97706";

function BabyBuddy() {
  return (
    <g transform="translate(60, 70)">
      {/* Body - small rounded blob */}
      <ellipse cx={0} cy={25} rx={22} ry={28} fill={BODY} />
      <ellipse cx={0} cy={22} rx={18} ry={22} fill={BODY_LIGHT} />
      {/* Head - large for baby proportion */}
      <circle cx={0} cy={-35} r={32} fill={SKIN} />
      <ellipse cx={-8} cy={-38} rx={4} ry={5} fill={SKIN_DARK} opacity={0.4} />
      {/* Eyes - big and cute */}
      <ellipse cx={-10} cy={-38} rx={6} ry={8} fill="#2d2d2d" />
      <ellipse cx={10} cy={-38} rx={6} ry={8} fill="#2d2d2d" />
      <circle cx={-8} cy={-36} r={2} fill="white" />
      <circle cx={12} cy={-36} r={2} fill="white" />
      {/* Small smile */}
      <path d="M -6 -28 Q 0 -24 6 -28" stroke="#2d2d2d" strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* Rosy cheeks */}
      <ellipse cx={-22} cy={-32} rx={6} ry={4} fill="#f4a5a5" opacity={0.5} />
      <ellipse cx={22} cy={-32} rx={6} ry={4} fill="#f4a5a5" opacity={0.5} />
    </g>
  );
}

function ToddlerBuddy() {
  return (
    <g transform="translate(60, 70)">
      {/* Body - slightly more defined */}
      <ellipse cx={0} cy={30} rx={28} ry={32} fill={BODY} />
      <ellipse cx={0} cy={26} rx={24} ry={26} fill={BODY_LIGHT} />
      {/* Arms - small */}
      <ellipse cx={-28} cy={15} rx={8} ry={12} fill={SKIN} transform="rotate(-20 -28 15)" />
      <ellipse cx={28} cy={15} rx={8} ry={12} fill={SKIN} transform="rotate(20 28 15)" />
      {/* Head */}
      <circle cx={0} cy={-38} r={30} fill={SKIN} />
      <ellipse cx={-6} cy={-42} rx={3} ry={4} fill={SKIN_DARK} opacity={0.3} />
      {/* Eyes */}
      <ellipse cx={-10} cy={-40} rx={5} ry={7} fill="#2d2d2d" />
      <ellipse cx={10} cy={-40} rx={5} ry={7} fill="#2d2d2d" />
      <circle cx={-7} cy={-38} r={2} fill="white" />
      <circle cx={13} cy={-38} r={2} fill="white" />
      {/* Smile */}
      <path d="M -8 -30 Q 0 -25 8 -30" stroke="#2d2d2d" strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <ellipse cx={-20} cy={-34} rx={5} ry={3} fill="#f4a5a5" opacity={0.5} />
      <ellipse cx={20} cy={-34} rx={5} ry={3} fill="#f4a5a5" opacity={0.5} />
    </g>
  );
}

function GrowingBuddy() {
  return (
    <g transform="translate(60, 70)">
      {/* Body - more athletic */}
      <ellipse cx={0} cy={35} rx={32} ry={36} fill={BODY} />
      <ellipse cx={0} cy={30} rx={28} ry={30} fill={BODY_LIGHT} />
      {/* Arms - flexed */}
      <ellipse cx={-32} cy={10} rx={10} ry={14} fill={SKIN} transform="rotate(-15 -32 10)" />
      <ellipse cx={32} cy={10} rx={10} ry={14} fill={SKIN} transform="rotate(15 32 10)" />
      {/* Head */}
      <circle cx={0} cy={-40} r={28} fill={SKIN} />
      <ellipse cx={-5} cy={-44} rx={3} ry={4} fill={SKIN_DARK} opacity={0.3} />
      {/* Eyes - determined */}
      <ellipse cx={-9} cy={-42} rx={5} ry={6} fill="#2d2d2d" />
      <ellipse cx={9} cy={-42} rx={5} ry={6} fill="#2d2d2d" />
      <circle cx={-6} cy={-40} r={2} fill="white" />
      <circle cx={12} cy={-40} r={2} fill="white" />
      {/* Confident smile */}
      <path d="M -10 -32 Q 0 -26 10 -32" stroke="#2d2d2d" strokeWidth={2} fill="none" strokeLinecap="round" />
    </g>
  );
}

function StrongBuddy() {
  return (
    <g transform="translate(60, 70)">
      {/* Body - strong, broad */}
      <ellipse cx={0} cy={38} rx={36} ry={40} fill={BODY} />
      <ellipse cx={0} cy={32} rx={32} ry={34} fill={BODY_LIGHT} />
      {/* Muscle definition hint */}
      <ellipse cx={-12} cy={35} rx={4} ry={8} fill={BODY} opacity={0.3} />
      <ellipse cx={12} cy={35} rx={4} ry={8} fill={BODY} opacity={0.3} />
      {/* Arms - strong */}
      <ellipse cx={-36} cy={5} rx={12} ry={16} fill={SKIN} transform="rotate(-10 -36 5)" />
      <ellipse cx={36} cy={5} rx={12} ry={16} fill={SKIN} transform="rotate(10 36 5)" />
      {/* Fists */}
      <circle cx={-42} cy={-5} r={8} fill={SKIN} />
      <circle cx={42} cy={-5} r={8} fill={SKIN} />
      {/* Head */}
      <circle cx={0} cy={-42} r={26} fill={SKIN} />
      <ellipse cx={-4} cy={-46} rx={3} ry={3} fill={SKIN_DARK} opacity={0.3} />
      {/* Eyes - focused */}
      <ellipse cx={-8} cy={-44} rx={5} ry={5} fill="#2d2d2d" />
      <ellipse cx={8} cy={-44} rx={5} ry={5} fill="#2d2d2d" />
      <circle cx={-5} cy={-42} r={1.5} fill="white" />
      <circle cx={11} cy={-42} r={1.5} fill="white" />
      {/* Strong smile */}
      <path d="M -12 -34 Q 0 -27 12 -34" stroke="#2d2d2d" strokeWidth={2} fill="none" strokeLinecap="round" />
    </g>
  );
}

function ChampionBuddy() {
  return (
    <g transform="translate(60, 70)">
      {/* Cape/wings effect - triumphant */}
      <path
        d="M -50 0 Q -60 -30 -45 -50 Q -30 -70 0 -60 Q 30 -70 45 -50 Q 60 -30 50 0 Z"
        fill={ACCENT}
        opacity={0.9}
      />
      <path
        d="M -45 0 Q -52 -25 -40 -42 Q -25 -58 0 -50 Q 25 -58 40 -42 Q 52 -25 45 0 Z"
        fill={ACCENT_DARK}
        opacity={0.5}
      />
      {/* Body - heroic stance */}
      <ellipse cx={0} cy={40} rx={38} ry={42} fill={BODY} />
      <ellipse cx={0} cy={34} rx={34} ry={36} fill={BODY_LIGHT} />
      {/* Arms - raised/victorious */}
      <path d="M -25 10 L -45 -25 L -35 -20 L -22 5 Z" fill={SKIN} />
      <path d="M 25 10 L 45 -25 L 35 -20 L 22 5 Z" fill={SKIN} />
      {/* Head */}
      <circle cx={0} cy={-44} r={28} fill={SKIN} />
      <ellipse cx={-4} cy={-48} rx={3} ry={3} fill={SKIN_DARK} opacity={0.3} />
      {/* Eyes - triumphant */}
      <ellipse cx={-8} cy={-46} rx={5} ry={6} fill="#2d2d2d" />
      <ellipse cx={8} cy={-46} rx={5} ry={6} fill="#2d2d2d" />
      <circle cx={-5} cy={-44} r={2} fill="white" />
      <circle cx={11} cy={-44} r={2} fill="white" />
      {/* Big victorious smile */}
      <path d="M -14 -36 Q 0 -28 14 -36" stroke="#2d2d2d" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {/* Star/crown accent above head */}
      <path
        d="M 0 -75 L 4 -66 L 14 -68 L 6 -60 L 8 -50 L 0 -54 L -8 -50 L -6 -60 L -14 -68 L -4 -66 Z"
        fill={ACCENT}
      />
    </g>
  );
}
