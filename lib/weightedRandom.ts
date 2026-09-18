/**
 * Picks an index using a cumulative-distribution weighted random pick.
 * Weights don't need to sum to any particular total. Falls back to a
 * uniform pick if every weight is zero/invalid.
 */
export function pickWeightedIndex(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w || 0), 0);

  if (total <= 0) {
    return Math.floor(Math.random() * weights.length);
  }

  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i] || 0);
    if (r <= 0) return i;
  }

  // Floating-point safety net.
  return weights.length - 1;
}
