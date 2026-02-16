"use client";

/**
 * Custom SVG illustrations for buddy hats and accessories
 */

export type HatId = "cap" | "crown" | "grad" | "tophat" | "helmet" | null;
export type AccessoryId = "glasses" | "bow" | "star" | null;

interface ItemSvgProps {
  size?: number;
  className?: string;
}

const ACCENT = "#f59e0b";
const GOLD = "#eab308";
const DARK = "#1e293b";

const hatDefs = (
  <defs>
    <linearGradient id="capGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#475569" />
      <stop offset="100%" stopColor="#1e3a5f" />
    </linearGradient>
    <linearGradient id="crownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#fef3c7" />
      <stop offset="50%" stopColor={GOLD} />
      <stop offset="100%" stopColor="#b45309" />
    </linearGradient>
    <linearGradient id="glassesGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#64748b" />
      <stop offset="50%" stopColor="#94a3b8" />
      <stop offset="100%" stopColor="#64748b" />
    </linearGradient>
  </defs>
);

export function HatIllustration({ id, size = 24 }: { id: HatId } & ItemSvgProps) {
  if (!id) return null;
  const s = size / 24;
  return (
    <g transform={`scale(${s})`}>
      {hatDefs}
      {id === "cap" && <CapSvg />}
      {id === "crown" && <CrownSvg />}
      {id === "grad" && <GradCapSvg />}
      {id === "tophat" && <TopHatSvg />}
      {id === "helmet" && <HelmetSvg />}
    </g>
  );
}

export function AccessoryIllustration({ id, size = 20 }: { id: AccessoryId } & ItemSvgProps) {
  if (!id) return null;
  const s = size / 20;
  return (
    <g transform={`scale(${s})`}>
      {hatDefs}
      {id === "glasses" && <GlassesSvg />}
      {id === "bow" && <BowSvg />}
      {id === "star" && <StarSvg />}
    </g>
  );
}

function CapSvg() {
  return (
    <g transform="translate(-12, -20)">
      <path
        d="M12 2 Q18 4 22 10 L24 14 Q24 18 20 20 L4 20 Q0 18 0 14 L2 10 Q6 4 12 2 Z"
        fill="url(#capGrad)"
        stroke="#0f172a"
        strokeWidth="0.5"
      />
      <path d="M4 20 L4 24 L20 24 L20 20" fill="#334155" stroke="#0f172a" strokeWidth="0.5" />
      <ellipse cx="12" cy="8" rx="8" ry="3" fill="#64748b" opacity="0.5" />
    </g>
  );
}

function CrownSvg() {
  return (
    <g transform="translate(-14, -28)">
      <path
        d="M14 4 L10 12 L6 8 L2 14 L0 12 L0 4 L4 2 L8 6 L12 2 L16 4 L16 12 L14 14 Z"
        fill="url(#crownGrad)"
        stroke={DARK}
        strokeWidth="0.4"
      />
      <circle cx="14" cy="6" r="1.5" fill="#fef9c3" />
      <circle cx="7" cy="10" r="1.2" fill="#fef9c3" />
      <circle cx="0" cy="8" r="1.5" fill="#fef9c3" />
      <path d="M2 14 L12 18 L22 14" fill="none" stroke="#b45309" strokeWidth="0.4" opacity="0.5" />
    </g>
  );
}

function GradCapSvg() {
  return (
    <g transform="translate(-14, -30)">
      <path
        d="M14 0 L26 6 L26 14 L14 18 L2 14 L2 6 Z"
        fill="#1e293b"
        stroke="#0f172a"
        strokeWidth="0.6"
      />
      <circle cx="14" cy="12" r="2" fill={GOLD} stroke="#b45309" strokeWidth="0.4" />
      <path d="M14 14 L14 22" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
      <path d="M14 22 L4 28 M14 22 L24 28" stroke="#64748b" strokeWidth="1" fill="none" />
    </g>
  );
}

function TopHatSvg() {
  return (
    <g transform="translate(-14, -32)">
      <ellipse cx="14" cy="6" rx="14" ry="4" fill="#0f172a" />
      <rect x="0" y="2" width="28" height="16" rx="1" fill="#1e293b" stroke="#0f172a" strokeWidth="0.6" />
      <rect x="4" y="18" width="20" height="3" rx="0.5" fill="#334155" />
    </g>
  );
}

function HelmetSvg() {
  return (
    <g transform="translate(-14, -26)">
      <path
        d="M14 2 Q24 4 26 10 Q28 16 24 20 L4 20 Q0 16 2 10 Q4 4 14 2 Z"
        fill="#64748b"
        stroke="#475569"
        strokeWidth="0.6"
      />
      <path d="M8 12 L20 12" stroke="#94a3b8" strokeWidth="1" opacity="0.8" />
      <ellipse cx="14" cy="6" rx="8" ry="2" fill="#94a3b8" opacity="0.4" />
    </g>
  );
}

function GlassesSvg() {
  return (
    <g transform="translate(-12, -8)">
      <circle cx="4" cy="0" r="5" fill="none" stroke="url(#glassesGrad)" strokeWidth="1" />
      <circle cx="20" cy="0" r="5" fill="none" stroke="url(#glassesGrad)" strokeWidth="1" />
      <path d="M9 0 L15 0" stroke="url(#glassesGrad)" strokeWidth="1" />
    </g>
  );
}

function BowSvg() {
  return (
    <g transform="translate(-10, -10)">
      <ellipse cx="0" cy="0" rx="8" ry="5" fill="#ec4899" stroke="#be185d" strokeWidth="0.6" />
      <ellipse cx="0" cy="0" rx="4" ry="3" fill="#f9a8d4" />
      <ellipse cx="-12" cy="2" rx="6" ry="4" fill="#ec4899" stroke="#be185d" strokeWidth="0.5" transform="rotate(-20 -12 2)" />
      <ellipse cx="12" cy="2" rx="6" ry="4" fill="#ec4899" stroke="#be185d" strokeWidth="0.5" transform="rotate(20 12 2)" />
    </g>
  );
}

function StarSvg() {
  return (
    <g transform="translate(-10, -10)">
      <path
        d="M10 0 L12 6 L18 6 L13 10 L15 16 L10 12 L5 16 L7 10 L2 6 L8 6 Z"
        fill={ACCENT}
        stroke="#d97706"
        strokeWidth="0.5"
      />
    </g>
  );
}
