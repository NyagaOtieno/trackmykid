import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Variant = keyof typeof BRAND.logos;

/**
 * <BrandLogo variant="icon" | "wordmark" | "full" />
 * - icon:     footprint pin only (favicon-style, for tight spaces)
 * - wordmark: "totowatch" lettering (white/light backgrounds — the "watch" is black)
 * - full:     wordmark + tagline + Powered by BimaTek (login screens)
 * The artwork is transparent, so on dark backgrounds put it on a white tile.
 */
export function BrandLogo({ variant = "icon", className }: { variant?: Variant; className?: string }) {
  return (
    <img
      src={BRAND.logos[variant]}
      alt={variant === "icon" ? `${BRAND.name} logo` : `${BRAND.name} - ${BRAND.tagline}`}
      className={cn("select-none object-contain", className)}
      draggable={false}
    />
  );
}

/** Small "TotoWatch - tagline - Powered by BimaTek" line for the bottom of pages. */
export function BrandFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("py-6 text-center text-xs text-muted-foreground", className)}>
      <span className="font-medium text-foreground">{BRAND.name}</span> &middot; {BRAND.tagline} &middot; Powered by{" "}
      <span className="font-semibold text-foreground">{BRAND.poweredBy}</span>
    </footer>
  );
}
