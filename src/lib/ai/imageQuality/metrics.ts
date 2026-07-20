/**
 * Low-level image metrics using sharp (local only — no network).
 */

import type { ImageQualityMetrics } from "./types";

export interface RawImageData {
  width: number;
  height: number;
  /** Grayscale 0–255, length = width * height */
  gray: Uint8Array;
  channels: number;
}

async function loadSharp() {
  try {
    const sharp = (await import("sharp")).default;
    return sharp;
  } catch {
    return null;
  }
}

/**
 * Decode & downsample image for fast local analysis.
 * Returns null if the buffer cannot be decoded.
 */
export async function loadGrayscaleImage(
  buffer: Buffer,
  maxWidth = 480
): Promise<RawImageData | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;

  try {
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 8 || height < 8) return null;

    const targetWidth = Math.min(width, maxWidth);
    const { data, info } = await sharp(buffer, { failOn: "none" })
      .rotate() // honor EXIF orientation for analysis
      .resize({ width: targetWidth, withoutEnlargement: true })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      width: info.width,
      height: info.height,
      gray: new Uint8Array(data),
      channels: info.channels,
    };
  } catch {
    return null;
  }
}

export async function getOriginalDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number } | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;
  try {
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    if (!meta.width || !meta.height) return null;
    return { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

function meanStd(values: Uint8Array): { mean: number; std: number } {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  const mean = sum / Math.max(values.length, 1);
  let varSum = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - mean;
    varSum += d * d;
  }
  return { mean, std: Math.sqrt(varSum / Math.max(values.length, 1)) };
}

/** Laplacian-variance style blur score (higher = sharper). */
export function computeBlurScore(gray: Uint8Array, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        -4 * gray[i] +
        gray[i - 1] +
        gray[i + 1] +
        gray[i - width] +
        gray[i + width];
      sumSq += lap * lap;
      count += 1;
    }
  }
  return count === 0 ? 0 : sumSq / count;
}

/** Ratio of near-white pixels (glare / overexposure candidates). */
export function computeGlareRatio(gray: Uint8Array): number {
  let bright = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] >= 245) bright += 1;
  }
  return bright / Math.max(gray.length, 1);
}

/**
 * Fraction of border pixels that look like non-paper (dark/busy),
 * used as a weak signal for missing page edges / tight crop.
 */
export function computeBorderStats(
  gray: Uint8Array,
  width: number,
  height: number
): { darkBorderRatio: number; edgeContentRatio: number } {
  const border = Math.max(2, Math.floor(Math.min(width, height) * 0.04));
  let borderCount = 0;
  let darkBorder = 0;
  let edgeHighVar = 0;

  const visit = (x: number, y: number) => {
    const i = y * width + x;
    const v = gray[i];
    borderCount += 1;
    if (v < 40) darkBorder += 1;
    // Local contrast near edge → content cut off at frame
    if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
      const local =
        Math.abs(v - gray[i - 1]) +
        Math.abs(v - gray[i + 1]) +
        Math.abs(v - gray[i - width]) +
        Math.abs(v - gray[i + width]);
      if (local > 80) edgeHighVar += 1;
    }
  };

  for (let x = 0; x < width; x++) {
    for (let t = 0; t < border; t++) {
      visit(x, t);
      visit(x, height - 1 - t);
    }
  }
  for (let y = border; y < height - border; y++) {
    for (let t = 0; t < border; t++) {
      visit(t, y);
      visit(width - 1 - t, y);
    }
  }

  return {
    darkBorderRatio: darkBorder / Math.max(borderCount, 1),
    edgeContentRatio: edgeHighVar / Math.max(borderCount, 1),
  };
}

/**
 * Rough estimate of distinct bright "paper" regions via vertical projection gaps.
 * >1 can indicate multiple documents stacked in one frame.
 */
export function estimatePaperRegions(
  gray: Uint8Array,
  width: number,
  height: number
): number {
  const rowMeans = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) sum += gray[y * width + x];
    rowMeans[y] = sum / width;
  }

  const global = meanStd(gray).mean;
  const paperThreshold = Math.min(220, global + 25);

  // Mark bright rows
  const bright = new Uint8Array(height);
  for (let y = 0; y < height; y++) {
    bright[y] = rowMeans[y] >= paperThreshold ? 1 : 0;
  }

  // Count contiguous bright bands separated by dark gaps
  let regions = 0;
  let inRegion = false;
  let gap = 0;
  const minGap = Math.max(8, Math.floor(height * 0.06));
  const minBand = Math.max(10, Math.floor(height * 0.08));
  let bandLen = 0;

  for (let y = 0; y < height; y++) {
    if (bright[y]) {
      if (!inRegion) {
        if (gap >= minGap || regions === 0) {
          inRegion = true;
          bandLen = 1;
        } else {
          bandLen += 1;
          inRegion = true;
        }
      } else {
        bandLen += 1;
      }
      gap = 0;
    } else {
      if (inRegion && bandLen >= minBand) {
        regions += 1;
      }
      inRegion = false;
      bandLen = 0;
      gap += 1;
    }
  }
  if (inRegion && bandLen >= minBand) regions += 1;

  return Math.max(regions, 1);
}

export function computeMetrics(
  raw: RawImageData,
  originalWidth: number,
  originalHeight: number
): ImageQualityMetrics {
  const { mean, std } = meanStd(raw.gray);
  const blurScore = computeBlurScore(raw.gray, raw.width, raw.height);
  const glareRatio = computeGlareRatio(raw.gray);
  const borders = computeBorderStats(raw.gray, raw.width, raw.height);
  const estimatedPaperRegions = estimatePaperRegions(
    raw.gray,
    raw.width,
    raw.height
  );

  return {
    width: originalWidth,
    height: originalHeight,
    meanLuminance: mean,
    luminanceStdDev: std,
    blurScore,
    glareRatio,
    darkBorderRatio: borders.darkBorderRatio,
    edgeContentRatio: borders.edgeContentRatio,
    aspectRatio: originalWidth / Math.max(originalHeight, 1),
    estimatedPaperRegions,
  };
}
