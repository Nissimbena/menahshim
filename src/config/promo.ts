/**
 * Sponsor promo strip on the home page (under the hero).
 *
 * Turn it off by setting `enabled: false`, or let it switch itself off on
 * `until` (the last day it shows, local time). The logo lives in
 * /public/partners/ - if the file is missing the store name is shown as text.
 */
export interface Promo {
  enabled: boolean;
  /** Last day to show the strip, "YYYY-MM-DD" (inclusive). */
  until?: string;
  /** Store name - also the fallback when the logo can't load. */
  partner: string;
  /** Path under /public. */
  logo: string;
  /** Where the button goes. */
  url: string;
  /** Key for click tracking (trackLinkEvent). */
  trackKey: string;
}

export const HOME_PROMO: Promo = {
  enabled: true,
  partner: "MATCHDAY",
  logo: "partners/matchday.png",
  url: "https://matchday-store.com/collections/%D7%92%D7%95%D7%A4%D7%99%D7%95%D7%AA-nba",
  trackKey: "promo_matchday",
};

export function activePromo(now = new Date()): Promo | null {
  const p = HOME_PROMO;
  if (!p.enabled) return null;
  if (p.until) {
    const [y, m, d] = p.until.split("-").map(Number);
    if (now > new Date(y, m - 1, d, 23, 59, 59)) return null;
  }
  return p;
}
