/**
 * Map themes. All are OpenFreeMap styles (OpenStreetMap vector tiles, no key, same attribution), so switching
 * theme changes only the look. A satellite theme is left out on purpose: no free imagery source has both a
 * licence we can use and building-level sharpness for Dubai.
 */
export type ThemeId = "light" | "standard" | "dark" | "night";

export type MapTheme = {
  label: string;
  styleUrl: string;
  /** Colour for OpenStreetMap buildings we have no figures for (the grey 3D city around ours). */
  baseBuilding: string;
  /** Launch community outline. */
  outline: string;
  /** Ring around dots and the hover outline, contrasting with the map. */
  halo: string;
  /** Hover / selected highlight. */
  highlight: string;
  dark: boolean;
};

const OFM = "https://tiles.openfreemap.org/styles";

export const THEMES: Record<ThemeId, MapTheme> = {
  light: { label: "Light", styleUrl: `${OFM}/positron`, baseBuilding: "#e3e5e8", outline: "#2a69a6", halo: "#ffffff", highlight: "#111827", dark: false },
  standard: { label: "Standard", styleUrl: `${OFM}/liberty`, baseBuilding: "#d9dde2", outline: "#2a69a6", halo: "#ffffff", highlight: "#111827", dark: false },
  dark: { label: "Dark", styleUrl: `${OFM}/dark`, baseBuilding: "#2c3138", outline: "#7fb2e5", halo: "#0d0f12", highlight: "#ffffff", dark: true },
  night: { label: "Night blue", styleUrl: `${OFM}/fiord`, baseBuilding: "#3a4a63", outline: "#a8c8f0", halo: "#1b2433", highlight: "#ffffff", dark: true },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const DEFAULT_THEME: ThemeId = "light";

export function parseTheme(v: string | null | undefined): ThemeId {
  return v && (THEME_IDS as string[]).includes(v) ? (v as ThemeId) : DEFAULT_THEME;
}
