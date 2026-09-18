/**
 * Lightens (positive percent) or darkens (negative percent) a "#rrggbb" hex
 * color. Used to derive a gradient from a single admin-picked brand color.
 */
export function shadeHex(hex: string, percent: number): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  const base = match ? match[1] : 'B3121C';
  const num = parseInt(base, 16);
  const amt = Math.round(2.55 * percent);

  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));

  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}
