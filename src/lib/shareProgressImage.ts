import { canvasToBlob, drawBrandFooter } from "@/lib/shareImage";
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

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#059669");
  gradient.addColorStop(0.55, "#10b981");
  gradient.addColorStop(1, "#34d399");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.22, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 52px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Proveit", 72, 96);

  ctx.font = "600 34px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText("My garden progress", 72, 148);

  ctx.font = "800 180px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(String(stats.maxStreak), width / 2, hasGarden ? 390 : 430);

  ctx.font = "600 42px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText(
    `${stats.streakUnit} streak${stats.maxStreak === 1 ? "" : "s"}`,
    width / 2,
    hasGarden ? 458 : 500
  );

  const provedLine =
    stats.totalDueToday > 0
      ? `Proved today: ${stats.goalsDoneToday}/${stats.totalDueToday}`
      : `${stats.activeGoals} active goal${stats.activeGoals === 1 ? "" : "s"}`;

  ctx.font = "500 36px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(provedLine, width / 2, hasGarden ? 518 : 580);

  if (hasGarden) {
    await drawGardenSnapshotRow(ctx, stats.gardenPlants!, {
      x: 72,
      y: 580,
      width: width - 144,
      height: 300,
    }, { label: "My garden" });
  } else {
    ctx.font = "500 30px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("Set goals. Take a photo. Prove it.", width / 2, 640);
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  drawBrandFooter(ctx, width, height - 48);

  return canvasToBlob(canvas);
}
