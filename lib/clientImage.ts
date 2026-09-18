'use client';

export const MAX_DATA_URL_LENGTH = 350_000;
const JPEG_QUALITIES = [0.72, 0.5, 0.35];
const BG_REMOVAL_DIMENSIONS = [400, 300, 220, 160];

// Brightness/saturation thresholds for classifying a pixel as "white/gray
// background" rather than part of the product photo. Pixels near the
// threshold get a ramped (partial) alpha instead of a hard cutoff, so the
// cut edge around the subject doesn't look jagged.
const FADE_START = 225;
const FADE_END = 245;
const SATURATION_LIMIT = 22;

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

/** Makes near-white/gray pixels transparent in place, leaving colored subject pixels untouched. */
function stripWhiteBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);

    if (saturation <= SATURATION_LIMIT && brightness >= FADE_START) {
      const fade = Math.min(1, (brightness - FADE_START) / (FADE_END - FADE_START));
      data[i + 3] = Math.round(data[i + 3] * (1 - fade));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawToCanvas(img: HTMLImageElement, dimension: number) {
  const scale = Math.min(1, dimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image compression is not supported in this browser.');
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

/**
 * Resizes an uploaded image so it's small enough to store inline (no
 * separate file storage service needed). With `removeWhiteBackground`, the
 * near-white background is made transparent and the result is exported as
 * PNG (needed for alpha) with a shrink-and-retry ladder to hit the size cap,
 * since PNG has no quality knob the way JPEG does. Without it, the image is
 * exported as JPEG with a quality retry ladder, as before.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 400,
  opts?: { removeWhiteBackground?: boolean }
): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  if (opts?.removeWhiteBackground) {
    const dimensions = [maxDimension, ...BG_REMOVAL_DIMENSIONS.filter((d) => d < maxDimension)];
    for (const dim of dimensions) {
      const { canvas, ctx, width, height } = drawToCanvas(img, dim);
      stripWhiteBackground(ctx, width, height);
      const result = canvas.toDataURL('image/png');
      if (result.length <= MAX_DATA_URL_LENGTH) return result;
    }
    throw new Error('That image is too large even after compression. Try a simpler photo.');
  }

  const { canvas } = drawToCanvas(img, maxDimension);
  for (const quality of JPEG_QUALITIES) {
    const result = canvas.toDataURL('image/jpeg', quality);
    if (result.length <= MAX_DATA_URL_LENGTH) return result;
  }

  throw new Error('That image is too large even after compression. Try a simpler photo.');
}
