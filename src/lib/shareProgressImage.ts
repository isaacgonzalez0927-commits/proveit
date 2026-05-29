import {
  canvasToBlob,
  drawBrandFooter,
  drawFrostedPanel,
  drawHeroOrbs,
  drawProveitWordmark,
  fillHeroGradient,
  SHARE_FONT,
} from "@/lib/shareImage";
import { drawGardenSnapshotRow, type ShareGardenPlant } from "@/lib/shareGardenSnapshot";

export interface ProgressShareStats {
  maxStreak: number;
  streakUnit: "day" | "week";
  goalsDoneToday: number;
  totalDueToday: number;
  activeGoals: number;
  gardenPlants?: ShareGardenPlant[];
}

export function progressShareFilename(): string {
  const d = new Date().toISOString().slice(0, 10);
  return `proveit-progress-${d}.png`;
}

/** Build a shareable streak / progress card (browser only). */
export async function renderProgressShareImage(stats: ProgressShareStats): Promise<Blob> {
  const width = 1080;
  const height = 1080;
  const hasGarden = (stats.gardenPlants?.length ?? 0) > 0;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  fillHeroGradient(ctx, width, height);
  drawHeroOrbs(ctx, width, height);

  drawProveitWordmark(ctx, 64, 88);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = `500 28px ${SHARE_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("My progress", 64, 132);

  const cardX = 64;
  const cardW = width - 128;
  const cardY = hasGarden ? 168 : 188;
  const cardH = hasGarden ? 360 : 420;
  drawFrostedPanel(ctx, cardX, cardY, cardW, cardH, 32);

  const streakY = cardY + (hasGarden ? 118 : 148);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 168px ${SHARE_FONT}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(stats.maxStreak), width / 2, streakY);

  ctx.font = `600 38px ${SHARE_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fillText(
    `${stats.streakUnit} streak${stats.maxStreak === 1 ? "" : "s"}`,
    width / 2,
    streakY + 52
  );

  const provedLine =
    stats.totalDueToday > 0
      ? `Proved today · ${stats.goalsDoneToday}/${stats.totalDueToday}`
      : `${stats.activeGoals} active goal${stats.activeGoals === 1 ? "" : "s"}`;

  ctx.font = `500 30px ${SHARE_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.fillText(provedLine, width / 2, streakY + 108);

  if (!hasGarden) {
    ctx.font = `500 26px ${SHARE_FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText("Set goals · Take a photo · Prove it", width / 2, streakY + 168);
  }

  if (hasGarden) {
    await drawGardenSnapshotRow(
      ctx,
      stats.gardenPlants!,
      {
        x: 64,
        y: 568,
        width: width - 128,
        height: 312,
      },
      { label: "My garden" }
    );
  }

  drawBrandFooter(ctx, width, height - 44, { light: true });

  return canvasToBlob(canvas);
}
