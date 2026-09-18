export type Segment = {
  /** Stable identifier, also used to pick a fallback placeholder icon. */
  id: string;
  label: string;
  /** Optional image URL. Empty string falls back to a placeholder icon. */
  imageUrl: string;
  /** Hex color for the wedge fill. */
  color: string;
  /** Relative win weight. Does not need to sum to 100 — normalized at spin time. */
  weight: number;
};

export type SiteSettings = {
  brandName: string;
  /** Hex color, e.g. "#B3121C". Drives the page background and wheel accent color. */
  primaryColor: string;
  /** Optional logo image URL/data URI. Empty string falls back to brandName text. */
  logoUrl: string;
};
