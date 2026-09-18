'use client';

export const MAX_DATA_URL_LENGTH = 350_000;
const JPEG_QUALITIES = [0.72, 0.5, 0.35];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load that image.'));
    img.src = src;
  });
}

/**
 * Resizes an uploaded image to fit within maxDimension and re-encodes it as
 * a JPEG data URI small enough to store inline (no separate file storage
 * service needed). Retries at lower quality if the first pass is still too
 * large, and throws if it can't get under the cap.
 */
export async function compressImageFile(file: File, maxDimension = 400): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image compression is not supported in this browser.');
  ctx.drawImage(img, 0, 0, width, height);

  for (const quality of JPEG_QUALITIES) {
    const result = canvas.toDataURL('image/jpeg', quality);
    if (result.length <= MAX_DATA_URL_LENGTH) return result;
  }

  throw new Error('That image is too large even after compression. Try a simpler photo.');
}
