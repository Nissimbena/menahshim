import "./sponsor.css";
import { t } from "../i18n/i18n";
import { el } from "../ui/dom";

/**
 * Games presented by MATCHDAY. To drop the sponsorship: delete this folder, public/sponsors/,
 * the "sponsor.presented" strings and the two hook lines (HomeScreen hero + PredictionScreen).
 */
const SPONSORED_GAME_IDS = new Set(["ec-7"]);

export function isSponsoredGame(gameId?: string | null): boolean {
  return !!gameId && SPONSORED_GAME_IDS.has(gameId);
}

/** "Game presented by [logo]" - `hero` for the next-game card, `flow` for the strip above every prediction step. */
export function sponsorStrip(variant: "hero" | "flow"): HTMLElement {
  const src = `${import.meta.env.BASE_URL}sponsors/matchday.png`;
  const strip = el(
    "div",
    `sponsor sponsor--${variant}`,
    `<span class="sponsor__label"></span><span class="sponsor__plate"><img class="sponsor__logo" src="${src}" alt="MATCHDAY" width="505" height="325" /></span>`,
  );
  strip.querySelector(".sponsor__label")!.textContent = t("sponsor.presented");
  return strip;
}
