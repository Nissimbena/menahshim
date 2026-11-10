import "./sponsor.css";
import { t } from "../i18n/i18n";
import { icon } from "../ui/icons";
import { el } from "../ui/dom";

/**
 * Games presented by MATCHDAY (optionally with a prize). To drop the sponsorship: delete this folder,
 * public/sponsors/, the "sponsor.*" strings and the two hook lines (HomeScreen hero + PredictionScreen).
 */
const SPONSORED_GAMES: Record<string, { prize?: boolean }> = {
  "ec-7": { prize: true },
};

export function isSponsoredGame(gameId?: string | null): boolean {
  return !!gameId && gameId in SPONSORED_GAMES;
}

/** Stand-in for the prize photo: to use a real picture, drop it in public/sponsors/ and render an <img> here instead. */
let jerseyCount = 0;
const jerseySvg = () => {
  // Unique gradient id per copy: a hidden copy elsewhere in the page would otherwise break the fill.
  const id = `sj-body-${++jerseyCount}`;
  return `
<svg class="sponsor__jersey" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff3b4d"/><stop offset="1" stop-color="#b3001b"/>
    </linearGradient>
  </defs>
  <path d="M40 10 20 22 6 46l18 10 8-12v64h56V44l8 12 18-10-14-24L80 10c-6 8-34 8-40 0Z"
        fill="url(#${id})" stroke="#fff" stroke-opacity=".9" stroke-width="2" stroke-linejoin="round"/>
  <path d="M44 10 60 27 76 10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8.5 44.5 24 53M111.5 44.5 96 53" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  <text x="60" y="76" text-anchor="middle" font-family="Barlow Condensed, Arial, sans-serif" font-weight="700" font-size="30" fill="#fff">10</text>
</svg>`;
};

/** "Game presented by [logo]" plus the prize - `hero` for the next-game card, `flow` for the strip above every prediction step. */
export function sponsorStrip(variant: "hero" | "flow", gameId: string): HTMLElement {
  const src = `${import.meta.env.BASE_URL}sponsors/matchday.png`;
  const prize = SPONSORED_GAMES[gameId]?.prize;
  const strip = el(
    "div",
    `sponsor sponsor--${variant}`,
    `<div class="sponsor__row"><span class="sponsor__label"></span><span class="sponsor__plate"><img class="sponsor__logo" src="${src}" alt="MATCHDAY" width="505" height="325" /></span></div>
     ${
       prize
         ? `<div class="sponsor__prize">${jerseySvg()}<div class="sponsor__prize-text"><span class="sponsor__prize-tag">${icon("gift", { size: "sm" })}<span></span></span><strong class="sponsor__prize-item"></strong></div></div>`
         : ""
     }`,
  );
  strip.querySelector(".sponsor__label")!.textContent = t("sponsor.presented");
  if (prize) {
    strip.querySelector(".sponsor__prize-tag span")!.textContent = t("sponsor.prize.label");
    strip.querySelector(".sponsor__prize-item")!.textContent = t("sponsor.prize.item");
  }
  return strip;
}
