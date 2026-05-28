/** Blue hue of the source watering-can.png artwork. */
const SOURCE_HUE = 205;

function hueFromRgb(r: number, g: number, b: number): number {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
      break;
    case gn:
      h = ((bn - rn) / d + 2) * 60;
      break;
    default:
      h = ((rn - gn) / d + 4) * 60;
      break;
  }
  return h;
}

/** Shift the blue PNG to the active accent theme while keeping stripes/shadows. */
export function getThemedWateringCanFilter(): string {
  if (typeof window === "undefined") return "none";
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--prove-600-rgb").trim();
  const parts = raw.split(/\s+/).map((v) => Number(v));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return "drop-shadow(0 2px 4px rgba(0,0,0,0.16))";
  }
  const [r, g, b] = parts as [number, number, number];
  const delta = hueFromRgb(r, g, b) - SOURCE_HUE;
  return [
    `hue-rotate(${delta.toFixed(1)}deg)`,
    "saturate(1.12)",
    "brightness(1.02)",
    "drop-shadow(0 2px 4px rgba(0,0,0,0.16))",
  ].join(" ");
}
