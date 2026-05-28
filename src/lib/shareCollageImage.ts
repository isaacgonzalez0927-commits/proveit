import type { WeeklyCollage } from "@/lib/weeklyCollage";
import {
  canvasToBlob,
  drawBrandFooter,
  drawCoverImage,
  loadImage,
  roundRect,
} from "@/lib/shareImage";

const WIDTH = 1080;
const PAD = 36;
const COLS = 3;
const GAP = 12;
const HEADER = 120;
const FOOTER = 56;

export function collageShareFilename(collage: WeeklyCollage): string {
  return `proveit-collage-${collage.weekStart}.png`;
}

/** Build a shareable PNG grid from a weekly collage (browser only). */
export async function renderCollageShareImage(collage: WeeklyCollage): Promise<Blob> {
  const photos = collage.photos.slice(0, 9);
  const rows = Math.max(1, Math.ceil(photos.length / COLS));
  const gridW = WIDTH - PAD * 2;
  const cell = (gridW - GAP * (COLS - 1)) / COLS;
  const gridH = rows * cell + (rows - 1) * GAP;
  const height = HEADER + gridH + FOOTER + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, height);
  gradient.addColorStop(0, "#ecfdf5");
  gradient.addColorStop(1, "#d1fae5");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.fillStyle = "#065f46";
  ctx.font = "700 42px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Proveit", PAD, 52);

  ctx.fillStyle = "#047857";
  ctx.font = "600 28px system-ui, -apple-system, sans-serif";
  ctx.fillText("Weekly collage", PAD, 88);

  ctx.textAlign = "right";
  ctx.font = "600 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(collage.label, WIDTH - PAD, 88);

  ctx.textAlign = "left";
  ctx.font = "500 22px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#059669";
  ctx.fillText(
    `${collage.proofCount} proof${collage.proofCount === 1 ? "" : "s"}`,
    PAD,
    118
  );

  const images = await Promise.all(photos.map((p) => loadImage(p.imageDataUrl)));

  for (let i = 0; i < photos.length; i += 1) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (cell + GAP);
    const y = HEADER + row * (cell + GAP);
    drawCoverImage(ctx, images[i]!, x, y, cell, cell, 18);

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, x, y + cell - 44, cell, 44, 18);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "600 18px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    const title =
      photos[i]!.goalTitle.length > 18
        ? `${photos[i]!.goalTitle.slice(0, 17)}…`
        : photos[i]!.goalTitle;
    ctx.fillText(title, x + 10, y + cell - 16);
  }

  drawBrandFooter(ctx, WIDTH, height - 18);
  return canvasToBlob(canvas);
}
