/**
 * "מעבירים את הזמן בדרך למשחק" - a lightweight media tab with a few
 * hand-picked links to pass the time on the way to the game: two podcasts
 * and an artist page.
 */
import { t } from "../i18n/i18n";
import { screenHeader } from "../ui/ScreenHeader";
import { icon, type IconName } from "../ui/icons";
import { el, esc } from "../ui/dom";

export interface MediaLink {
  title: string;
  subtitle: string;
  url: string;
  /** Fallback icon when there's no artwork. */
  icon: IconName;
  logo?: string;
}

const MEDIA_LINKS: MediaLink[] = [
  {
    title: "כיפה אדומה",
    subtitle: "פודקאסט",
    url: "https://open.spotify.com/show/2tnW3oFPR4dkiPHJCFLHL8",
    icon: "headphones",
    logo: "https://i.scdn.co/image/ab6765630000ba8a5b43b0c7093bcab72a1d59bf",
  },
  {
    title: "מאחורי הסלים",
    subtitle: "פודקאסט",
    url: "https://open.spotify.com/show/0345nCU3sMSN0lpBVs6osA",
    icon: "basketball",
    logo: "https://i.scdn.co/image/ab6765630000ba8ac01fa2dee8482351a39b88f1",
  },
  {
    title: "שירי תיקו טוב",
    subtitle: "אמן - ספוטיפיי",
    url: "https://open.spotify.com/artist/5lat3ug3ZmejtVtYDqOjcp",
    icon: "headphones",
    logo: "https://f4.bcbits.com/img/0041931558_10.jpg",
  },
];

export class TimeKillerScreen {
  private container: HTMLElement;
  private onBack: () => void;

  constructor(container: HTMLElement, onBack: () => void) {
    this.container = container;
    this.onBack = onBack;
  }

  show() {
    this.container.classList.remove("hidden");
    this.render();
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private render() {
    this.container.innerHTML = "";
    const page = el("div", "screen time-killer");
    page.appendChild(
      screenHeader({ title: t("timeKiller.title"), subtitle: t("timeKiller.intro"), onBack: () => this.onBack() }),
    );

    const list = el("div", "media-list");
    MEDIA_LINKS.forEach((link) => {
      const card = el("a", "card media-card");
      card.href = link.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.innerHTML = `
        <span class="media-card__art">${link.logo ? `<img src="${link.logo}" alt="" width="72" height="72" loading="lazy" />` : icon(link.icon)}</span>
        <span class="list-row__main">
          <span class="t-h3" dir="auto">${esc(link.title)}</span>
          <span class="list-row__meta" dir="auto">${esc(link.subtitle)}</span>
          <span class="media-card__cta">${icon("headphones", { size: "sm" })}${t("timeKiller.cta")}</span>
        </span>
        ${icon("external", { size: "sm", className: "c-3" })}
      `;
      list.appendChild(card);
    });
    page.appendChild(list);
    this.container.appendChild(page);
  }
}
