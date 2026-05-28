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

export function drawBrandFooter(ctx: CanvasRenderingContext2D, width: number, y: number) {
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "500 22px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("proveit-goals.com", width / 2, y);
}
