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
  /** Hex color. Drives the SPIN button, wheel rim, and pointer. */
  primaryColor: string;
  /** Hex color. Middle stop of the page background gradient. */
  secondaryColor: string;
  /** Hex color. Bottom stop of the background gradient and the wheel rim's bulb dots. */
  accentColor: string;
  /** Optional logo image URL/data URI. Empty string falls back to brandName text. */
  logoUrl: string;
  /** When true, the spin runs a slower multi-phase "hold, creep, land" sequence for suspense. When false, it's one quick smooth spin. */
  suspenseMode: boolean;
};
