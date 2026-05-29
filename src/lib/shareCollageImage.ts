import type { WeeklyCollage } from "@/lib/weeklyCollage";
import {
  canvasToBlob,
  drawBrandFooter,
  drawLightCard,
  drawPhotoTile,
  drawProveitWordmark,
  fillLightGradient,
  loadImage,
  roundRect,
  SHARE_COLORS,
  SHARE_FONT,
} from "@/lib/shareImage";
import { drawGardenSnapshotRow, type ShareGardenPlant } from "@/lib/shareGardenSnapshot";

const WIDTH = 1080;
const PAD = 48;
const COLS = 3;
const GAP = 14;
const HEADER = 132;
const FOOTER = 64;
const GARDEN_PANEL = 228;

export function collageShareFilename(collage: WeeklyCollage): string {
  return `proveit-collage-${collage.weekStart}.png`;
}

function drawWeekPill(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number
): number {
  ctx.font = `600 22px ${SHARE_FONT}`;
  const textW = ctx.measureText(label).width;
  const pillW = textW + 32;
  const pillH = 40;
  const pillX = x - pillW;

  roundRect(ctx, pillX, y - pillH + 8, pillW, pillH, 20);
  ctx.fillStyle = SHARE_COLORS.emerald100;
  ctx.fill();
  ctx.fillStyle = SHARE_COLORS.emerald800;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x - 16, y - pillH / 2 + 8);
  return pillW;
}

/** Build a shareable PNG grid from a weekly collage (browser only). */
export async function renderCollageShareImage(
  collage: WeeklyCollage,
  gardenPlants: ShareGardenPlant[] = []
): Promise<Blob> {
  const photos = collage.photos.slice(0, 9);
  const rows = Math.max(1, Math.ceil(photos.length / COLS));
  const gridW = WIDTH - PAD * 2;
  const cell = (gridW - GAP * (COLS - 1)) / COLS;
  const gridH = rows * cell + (rows - 1) * GAP;
  const hasGarden = gardenPlants.length > 0;
  const gardenBlock = hasGarden ? GARDEN_PANEL + 20 : 0;
  const height = HEADER + gridH + gardenBlock + FOOTER + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  fillLightGradient(ctx, WIDTH, height);

  drawProveitWordmark(ctx, PAD, 64, { light: false, size: "sm" });

  ctx.fillStyle = SHARE_COLORS.slate600;
  ctx.font = `500 24px ${SHARE_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Weekly collage", PAD, 100);

  drawWeekPill(ctx, collage.label, WIDTH - PAD, 78);

  ctx.fillStyle = SHARE_COLORS.emerald700;
  ctx.font = `600 22px ${SHARE_FONT}`;
  ctx.textAlign = "left";
  ctx.fillText(
    `${collage.proofCount} proof${collage.proofCount === 1 ? "" : "s"}`,
    PAD,
    124
  );

  const images = await Promise.all(photos.map((p) => loadImage(p.imageDataUrl)));

  for (let i = 0; i < photos.length; i += 1) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (cell + GAP);
    const y = HEADER + row * (cell + GAP);
    drawPhotoTile(ctx, images[i]!, x, y, cell, {
      radius: 18,
      label: photos[i]!.goalTitle,
    });
  }

  if (hasGarden) {
    const gardenY = HEADER + gridH + 20;
    drawLightCard(ctx, PAD, gardenY, WIDTH - PAD * 2, GARDEN_PANEL, 24);
    await drawGardenSnapshotRow(
      ctx,
      gardenPlants,
      {
        x: PAD + 8,
        y: gardenY + 8,
        width: WIDTH - PAD * 2 - 16,
        height: GARDEN_PANEL - 16,
      },
      { label: "My garden", lightPanel: true, onLightBackground: true }
    );
  }

  drawBrandFooter(ctx, WIDTH, height - 28, { light: false });

  return canvasToBlob(canvas);
}
