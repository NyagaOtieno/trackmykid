// Single source of truth for branding. Change the name/tagline here and
// every screen that uses <BrandLogo/> / <BrandFooter/> / BRAND.name follows.
export const BRAND = {
  name: "TotoWatch",
  tagline: "Little steps in motion.",
  poweredBy: "BimaTek",
  // Exact colours sampled from the supplied logo artwork.
  colors: {
    blue: "#0172db",
    green: "#6db40c",
    red: "#f31a13",
  },
  // Files live in /public (served from the site root).
  logos: {
    icon: "/logo-icon.png",         // footprint pin only
    wordmark: "/logo-wordmark.png", // "totowatch" lettering, no tagline
    full: "/logo-full.png",         // wordmark + tagline + "Powered by BimaTek"
  },
} as const;
