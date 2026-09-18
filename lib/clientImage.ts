'use client';

export const MAX_DATA_URL_LENGTH = 350_000;
const JPEG_QUALITIES = [0.72, 0.5, 0.35];
const BG_REMOVAL_DIMENSIONS = [400, 300, 220, 160];
const CROP_PADDING_RATIO = 0.08;

// Brightness/saturation thresholds for classifying a pixel as "white/gray
// background" rather than part of the subject. Pixels near the threshold
// get a ramped (partial) alpha instead of a hard cutoff, so the cut edge
// around the subject doesn't look jagged.
const FADE_START = 225;
const FADE_END = 245;
const SATURATION_LIMIT = 22;

// For content bounding-box detection only: real-world exports often have
// near-black letterbox/margin bars (not just white), so bounding-box
// detection treats low-saturation pixels at EITHER brightness extreme as
// margin. This is deliberately not used for stripWhiteBackground, which
// must only ever erase white — a black shadow or grill-mark on a product
// photo should never be erased.
const DARK_MARGIN_BRIGHTNESS = 30;

type ImageSource = HTMLImageElement | HTMLCanvasElement;

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

function isBackgroundPixel(r: number, g: number, b: number) {
  const brightness = (r + g + b) / 3;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  return saturation <= SATURATION_LIMIT && brightness >= FADE_START;
}

/** Broader than isBackgroundPixel: also treats near-black low-saturation pixels as margin. */
function isMarginPixel(r: number, g: number, b: number) {
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  if (saturation > SATURATION_LIMIT) return false;
  const brightness = (r + g + b) / 3;
  return brightness >= FADE_START || brightness <= DARK_MARGIN_BRIGHTNESS;
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

    if (isBackgroundPixel(r, g, b)) {
      const fade = Math.min(1, (brightness - FADE_START) / (FADE_END - FADE_START));
      data[i + 3] = Math.round(data[i + 3] * (1 - fade));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/** Finds the tight bounding box of non-background content. Doesn't modify any pixels. */
function findContentBoundingBox(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a === 0) continue;
      if (isMarginPixel(data[i], data[i + 1], data[i + 2])) continue;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;
  return { x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 };
}

/** Crops the source down to its content bounding box (plus a small margin), or returns it unchanged if nothing was found. */
function cropToContent(source: ImageSource): ImageSource {
  const full = drawToCanvas(source, Math.max(source.width, source.height));
  const box = findContentBoundingBox(full.ctx, full.width, full.height);
  if (!box) return source;

  const boxWidth = box.x1 - box.x0;
  const boxHeight = box.y1 - box.y0;
  const pad = Math.round(Math.max(boxWidth, boxHeight) * CROP_PADDING_RATIO);

  const srcX = Math.max(0, box.x0 - pad);
  const srcY = Math.max(0, box.y0 - pad);
  const srcX2 = Math.min(full.width, box.x1 + pad);
  const srcY2 = Math.min(full.height, box.y1 + pad);
  const width = srcX2 - srcX;
  const height = srcY2 - srcY;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image compression is not supported in this browser.');
  ctx.drawImage(full.canvas, srcX, srcY, width, height, 0, 0, width, height);
  return canvas;
}

function drawToCanvas(source: ImageSource, dimension: number) {
  const scale = Math.min(1, dimension / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image compression is not supported in this browser.');
  ctx.drawImage(source, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

/**
 * Resizes an uploaded image so it's small enough to store inline (no
 * separate file storage service needed).
 *
 * - `removeWhiteBackground`: makes the near-white background transparent and
 *   exports as PNG (needed for alpha) with a shrink-and-retry ladder to hit
 *   the size cap, since PNG has no quality knob the way JPEG does.
 * - `cropToContent`: trims empty margin around the subject down to a tight
 *   bounding box (plus a small padding) before resizing — for logos, so a
 *   circular `object-fit: cover` frame doesn't shrink the mark down to fit
 *   a mostly-empty source image.
 * - With neither option, the image is exported as JPEG with a quality retry
 *   ladder, as before.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 400,
  opts?: { removeWhiteBackground?: boolean; cropToContent?: boolean }
): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);
  let source: ImageSource = await loadImage(rawDataUrl);

  if (opts?.cropToContent) {
    source = cropToContent(source);
  }

  if (opts?.removeWhiteBackground) {
    const dimensions = [maxDimension, ...BG_REMOVAL_DIMENSIONS.filter((d) => d < maxDimension)];
    for (const dim of dimensions) {
      const { canvas, ctx, width, height } = drawToCanvas(source, dim);
      stripWhiteBackground(ctx, width, height);
      const result = canvas.toDataURL('image/png');
      if (result.length <= MAX_DATA_URL_LENGTH) return result;
    }
    throw new Error('That image is too large even after compression. Try a simpler photo.');
  }

  const { canvas } = drawToCanvas(source, maxDimension);
  for (const quality of JPEG_QUALITIES) {
    const result = canvas.toDataURL('image/jpeg', quality);
    if (result.length <= MAX_DATA_URL_LENGTH) return result;
  }

  throw new Error('That image is too large even after compression. Try a simpler photo.');
}
