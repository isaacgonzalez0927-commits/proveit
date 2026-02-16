/**
 * Convert data URL to Blob for upload.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/**
 * Compress an image data URL for smaller payload (verify API, storage upload).
 * Resizes to max 1200px and reduces quality to stay under typical body limits.
 */
export async function compressImage(
  dataUrl: string,
  maxWidth = 1200,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = (height / width) * maxWidth;
          width = maxWidth;
        } else {
          width = (width / height) * maxWidth;
          height = maxWidth;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

/**
 * Upload proof image to Supabase Storage and return public URL.
 * Path: {userId}/{submissionId}.jpg
 */
export async function uploadProofToStorage(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  submissionId: string,
  dataUrl: string
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const path = `${userId}/${submissionId}.jpg`;
  const { data, error } = await supabase.storage
    .from("submission-images")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage.from("submission-images").getPublicUrl(data.path);
  return urlData.publicUrl;
}
