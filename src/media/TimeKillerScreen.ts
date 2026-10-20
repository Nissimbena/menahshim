/**
 * "מעבירים את הזמן בדרך למשחק" - a lightweight media tab with a few
 * hand-picked links to pass the time on the way to the game: two podcasts
 * and an artist page.
 */
import { t } from "../i18n/i18n";

export interface MediaLink {
  title: string;
  subtitle: string;
  url: string;
  colorClass: string;
  icon: string;
  logo?: string;
}

const MEDIA_LINKS: MediaLink[] = [
  {
    title: "כיפה אדומה",
    subtitle: "פודקאסט",
    url: "https://open.spotify.com/show/2tnW3oFPR4dkiPHJCFLHL8",
    colorClass: "media-card-red",
    icon: "🎙️",
    logo: "https://i.scdn.co/image/ab6765630000ba8a5b43b0c7093bcab72a1d59bf",
  },
  {
    title: "מאחורי הסלים",
    subtitle: "פודקאסט",
    url: "https://open.spotify.com/show/0345nCU3sMSN0lpBVs6osA",
    colorClass: "media-card-navy",
    icon: "🏀",
    logo: "https://i.scdn.co/image/ab6765630000ba8ac01fa2dee8482351a39b88f1",
  },
  {
    title: "שירי תיקו טוב",
    subtitle: "אמן - ספוטיפיי",
    url: "https://open.spotify.com/artist/5lat3ug3ZmejtVtYDqOjcp",
    colorClass: "media-card-black",
    icon: "🎵",
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

  private renderHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "prediction-header";
    header.innerHTML = `
      <button class="btn-back" type="button">&rarr; ${t("common.back")}</button>
      <div class="prediction-title"><h1>${t("timeKiller.title")}</h1></div>
      <div class="prediction-header-spacer"></div>
    `;
    header
      .querySelector(".btn-back")
      ?.addEventListener("click", () => this.onBack());
    return header;
  }

  private render() {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());

    const intro = document.createElement("p");
    intro.className = "counter-text";
    intro.textContent = t("timeKiller.intro");
    wrapper.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "media-grid";

    MEDIA_LINKS.forEach((link) => {
      const card = document.createElement("a");
      card.href = link.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.className = `media-card ${link.colorClass}`;
      card.innerHTML = `
        <span class="media-card-icon">${link.logo ? `<img class="media-card-logo" src="${link.logo}" alt="" />` : link.icon}</span>
        <span class="media-card-title" dir="auto">${link.title}</span>
        <span class="media-card-subtitle" dir="auto">${link.subtitle}</span>
        <span class="media-card-cta">${t("timeKiller.cta")} &larr;</span>
      `;
      grid.appendChild(card);
    });

    wrapper.appendChild(grid);
    this.container.appendChild(wrapper);
  }
}
