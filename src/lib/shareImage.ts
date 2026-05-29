/** Client-side helpers for generating and sharing PNG images. */

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareOrDownloadBlob(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<"shared" | "downloaded"> {
  if (typeof window !== "undefined" && window.isSecureContext && navigator.share) {
    const file = new File([blob], filename, { type: "image/png" });
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        return "shared";
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

function loadImageElement(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

async function loadImageFromBlobResponse(response: Response): Promise<HTMLImageElement> {
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadImageElement(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function isSameOriginUrl(src: string): boolean {
  if (src.startsWith("/")) return true;
  if (typeof window === "undefined") return false;
  try {
    return new URL(src, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Load an image safely for canvas export (avoids tainted canvas SecurityError). */
export async function loadImage(src: string): Promise<HTMLImageElement> {
  if (!src) throw new Error("Could not load image.");
  if (src.startsWith("data:") || src.startsWith("blob:") || isSameOriginUrl(src)) {
    return loadImageElement(src);
  }

  const sources = [
    src,
    `/api/share/image?url=${encodeURIComponent(src)}`,
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source, {
        mode: source.startsWith("/") ? "same-origin" : "cors",
        credentials: "omit",
      });
      if (!response.ok) continue;
      return await loadImageFromBlobResponse(response);
    } catch {
      /* try next source */
    }
  }

  return loadImageElement(src, true);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create image."));
    }, "image/png");
  });
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

export const SHARE_FONT =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const SHARE_COLORS = {
  emerald950: "#052e16",
  emerald900: "#064e3b",
  emerald800: "#065f46",
  emerald700: "#047857",
  emerald600: "#059669",
  emerald500: "#10b981",
  emerald400: "#34d399",
  emerald100: "#d1fae5",
  emerald50: "#ecfdf5",
  slate900: "#0f172a",
  slate600: "#475569",
  slate500: "#64748b",
  white: "#ffffff",
} as const;

export function fillHeroGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, SHARE_COLORS.emerald950);
  g.addColorStop(0.45, SHARE_COLORS.emerald800);
  g.addColorStop(1, SHARE_COLORS.emerald600);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

export function fillLightGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "#f8fafc");
  g.addColorStop(0.55, SHARE_COLORS.emerald50);
  g.addColorStop(1, SHARE_COLORS.emerald100);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

/** Soft decorative circles for hero backgrounds. */
export function drawHeroOrbs(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const orbs = [
    { x: width * 0.88, y: height * 0.12, r: 200, a: 0.08 },
    { x: width * 0.1, y: height * 0.72, r: 160, a: 0.06 },
    { x: width * 0.55, y: height * 0.95, r: 120, a: 0.05 },
  ];
  for (const orb of orbs) {
    const radial = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    radial.addColorStop(0, `rgba(255,255,255,${orb.a + 0.06})`);
    radial.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFrostedPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  options?: { fill?: string; stroke?: string; lineWidth?: number }
): void {
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = options?.fill ?? "rgba(255,255,255,0.14)";
  ctx.fill();
  if (options?.stroke !== undefined) {
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options?.lineWidth ?? 1.5;
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function drawLightCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  ctx.save();
  ctx.shadowColor = "rgba(15,23,42,0.08)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = SHARE_COLORS.white;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, radius);
  ctx.strokeStyle = "rgba(5,46,22,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawProveitWordmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options?: { light?: boolean; size?: "lg" | "sm" }
): void {
  const light = options?.light ?? true;
  const lg = options?.size !== "sm";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = light ? SHARE_COLORS.white : SHARE_COLORS.emerald900;
  ctx.font = `${lg ? 700 : 700} ${lg ? 44 : 36}px ${SHARE_FONT}`;
  ctx.fillText("Proveit", x, y);
}

export function drawBrandFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  options?: { light?: boolean }
): void {
  const light = options?.light ?? true;
  const lineY = y - 36;
  ctx.strokeStyle = light ? "rgba(255,255,255,0.2)" : "rgba(5,46,22,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width * 0.2, lineY);
  ctx.lineTo(width * 0.8, lineY);
  ctx.stroke();

  ctx.fillStyle = light ? "rgba(255,255,255,0.72)" : SHARE_COLORS.slate500;
  ctx.font = `500 20px ${SHARE_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("proveit-goals.com", width / 2, y);
}

export function drawPhotoTile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  options?: { radius?: number; label?: string }
): void {
  const radius = options?.radius ?? 20;
  const pad = 3;

  ctx.save();
  ctx.shadowColor = "rgba(15,23,42,0.14)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, x, y, size, size, radius + 2);
  ctx.fillStyle = SHARE_COLORS.white;
  ctx.fill();
  ctx.restore();

  drawCoverImage(ctx, img, x + pad, y + pad, size - pad * 2, size - pad * 2, radius);

  if (options?.label) {
    const inner = size - pad * 2;
    const lx = x + pad;
    const ly = y + pad;
    const labelH = 48;
    const grad = ctx.createLinearGradient(0, ly + inner - labelH, 0, ly + inner);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.35, "rgba(0,0,0,0.45)");
    grad.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.save();
    roundRect(ctx, lx, ly, inner, inner, radius);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(lx, ly + inner - labelH, inner, labelH);
    ctx.restore();

    ctx.fillStyle = SHARE_COLORS.white;
    ctx.font = `600 19px ${SHARE_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const title =
      options.label.length > 20 ? `${options.label.slice(0, 19)}…` : options.label;
    ctx.fillText(title, lx + 14, ly + inner - 16);
  }
}
