import "./sponsor.css";
import { t } from "../i18n/i18n";
import { icon } from "../ui/icons";
import { el } from "../ui/dom";
import { track } from "../analytics";
import type { SponsorshipInfo } from "../api/backend";

/**
 * Sponsored games come from the admin panel (Admin -> game -> Sponsorship). A game that is not in the
 * registry shows nothing at all. To drop the feature: delete this folder, the "sponsor.*"/"admin.sponsor.*"
 * strings, the backend calls at the end of api/backend.ts and the hook lines (main, HomeScreen, PredictionScreen, AdminScreen).
 */
let registry: Record<string, SponsorshipInfo> = {};

export function registerSponsorships(map: Record<string, SponsorshipInfo> | null | undefined) {
  registry = map ?? {};
}

export function getSponsorship(gameId: string): SponsorshipInfo | undefined {
  return registry[gameId];
}

export function isSponsoredGame(gameId?: string | null): boolean {
  return !!gameId && gameId in registry;
}

const safeUrl = (url: string): string | null => (/^https?:\/\//i.test(url) ? url : null);

/** "Game presented by [logo]" plus the prize - `hero` for the next-game card, `flow` for the strip above every prediction step. */
export function sponsorStrip(variant: "hero" | "flow", gameId: string): HTMLElement {
  const info = registry[gameId]!;
  const strip = el("div", `sponsor sponsor--${variant}`);

  const row = el("div", "sponsor__row");
  const label = el("span", "sponsor__label");
  label.textContent = t("sponsor.presented");
  row.appendChild(label);

  const link = safeUrl(info.sponsor.linkUrl);
  const logo = el("img", "sponsor__logo");
  logo.src = info.sponsor.logoUrl;
  logo.alt = info.sponsor.name;
  if (link) {
    const a = el("a", "sponsor__plate");
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener noreferrer sponsored";
    a.addEventListener("click", () => track("sponsor_clicked", { sponsor: info.sponsor.name, game_id: gameId }));
    a.appendChild(logo);
    row.appendChild(a);
  } else {
    const plate = el("span", "sponsor__plate");
    plate.appendChild(logo);
    row.appendChild(plate);
  }
  strip.appendChild(row);

  const prize = info.prize;
  if (prize) {
    const box = el("div", "sponsor__prize");
    if (prize.imageUrl) {
      const img = el("img", "sponsor__prize-img");
      img.src = prize.imageUrl;
      img.alt = prize.text ?? "";
      box.appendChild(img);
    } else {
      box.appendChild(el("span", "sponsor__prize-icon", icon("gift", { size: "lg" })));
    }
    const text = el("div", "sponsor__prize-text");
    const tag = el("span", "sponsor__prize-tag", icon("gift", { size: "sm" }));
    const tagText = el("span");
    tagText.textContent = t("sponsor.prize.label");
    tag.appendChild(tagText);
    text.appendChild(tag);
    if (prize.text) {
      const item = el("strong", "sponsor__prize-item");
      item.textContent = prize.text;
      text.appendChild(item);
    }
    box.appendChild(text);
    strip.appendChild(box);
  }
  return strip;
}
