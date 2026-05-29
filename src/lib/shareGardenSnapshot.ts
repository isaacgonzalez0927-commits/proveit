import type { PlantStageKey } from "@/components/PlantIllustration";
import { CACTUS_VARIANT, getImageStageForVariant, isFinalStage, type GoalPlantVariant } from "@/lib/goalPlants";
import { loadImage, roundRect, SHARE_COLORS, SHARE_FONT } from "@/lib/shareImage";

export interface ShareGardenPlant {
  stage: PlantStageKey;
  variant: GoalPlantVariant;
}

function buildPhotoCandidates(stage: PlantStageKey, variant: GoalPlantVariant): string[] {
  const logicalStageNumber = {
    seedling: 1,
    sprout: 2,
    leafy: 3,
    blooming: 4,
    thriving: 5,
    flowering: 6,
  }[stage];
  const imageStageNumber = getImageStageForVariant(logicalStageNumber, variant);

  if (variant === CACTUS_VARIANT) {
    return [
      `/plants/plant-stage-${imageStageNumber}-${variant}.png`,
      `/plants/plant-stage-${imageStageNumber}.png`,
    ];
  }

  if (isFinalStage(stage, variant)) {
    return [
      `/plants/plant-stage-${imageStageNumber}-${variant}.png`,
      `/plants/plant-stage-${imageStageNumber}.png`,
    ];
  }
  return [`/plants/plant-stage-${imageStageNumber}.png`];
}

async function resolvePlantImage(stage: PlantStageKey, variant: GoalPlantVariant): Promise<HTMLImageElement | null> {
  for (const src of buildPhotoCandidates(stage, variant)) {
    try {
      return await loadImage(src);
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

/** Draw a row of garden plants into a canvas panel (browser only). */
export async function drawGardenSnapshotRow(
  ctx: CanvasRenderingContext2D,
  plants: ShareGardenPlant[],
  box: { x: number; y: number; width: number; height: number },
  options?: { label?: string; lightPanel?: boolean; onLightBackground?: boolean }
): Promise<void> {
  const visible = plants.slice(0, 8);
  if (visible.length === 0) return;

  const onLight = options?.onLightBackground ?? false;
  const lightPanel = options?.lightPanel ?? !onLight;

  if (!onLight) {
    roundRect(ctx, box.x, box.y, box.width, box.height, 24);
    ctx.fillStyle = lightPanel ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (options?.label) {
    ctx.fillStyle = onLight ? SHARE_COLORS.emerald800 : "rgba(255,255,255,0.9)";
    ctx.font = `600 22px ${SHARE_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(options.label, box.x + (onLight ? 20 : 24), box.y + (onLight ? 32 : 36));
  }

  const padX = onLight ? 16 : 20;
  const padBottom = onLight ? 14 : 18;
  const labelSpace = options?.label ? (onLight ? 48 : 44) : 12;
  const innerW = box.width - padX * 2;
  const innerH = box.height - labelSpace - padBottom;
  const slotW = innerW / visible.length;
  const maxPlantH = innerH * 0.92;
  const maxPlantW = Math.min(onLight ? 108 : 118, slotW * 0.88);

  const images = await Promise.all(
    visible.map((plant) => resolvePlantImage(plant.stage, plant.variant))
  );

  for (let i = 0; i < visible.length; i += 1) {
    const img = images[i];
    if (!img) continue;

    const scale = Math.min(maxPlantW / img.width, maxPlantH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const slotX = box.x + padX + i * slotW;
    const x = slotX + (slotW - dw) / 2;
    const groundY = box.y + box.height - padBottom;

    if (onLight) {
      const pedestalW = Math.min(slotW * 0.72, dw + 24);
      const pedestalH = 10;
      const px = slotX + (slotW - pedestalW) / 2;
      const py = groundY - pedestalH;
      roundRect(ctx, px, py, pedestalW, pedestalH, 5);
      ctx.fillStyle = SHARE_COLORS.emerald100;
      ctx.fill();
    }

    const y = groundY - dh;
    ctx.drawImage(img, x, y, dw, dh);
  }
}
