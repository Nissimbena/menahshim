import { SPORTS } from "./sportsData";
import { t, getLang } from "../i18n/i18n";

/** Step 1 of the drill-down: pick a sport (כדורגל/כדורסל/רוגבי/...). */
export class SportsHomeScreen {
  private container: HTMLElement;
  private onBack: () => void;
  private onSelectSport: (sportId: string) => void;

  constructor(
    container: HTMLElement,
    onBack: () => void,
    onSelectSport: (sportId: string) => void,
  ) {
    this.container = container;
    this.onBack = onBack;
    this.onSelectSport = onSelectSport;

    window.addEventListener("langchange", () => {
      if (!this.container.classList.contains("hidden")) this.render();
    });
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
      <div class="prediction-title"><h1>${t("sportsHub.home.title")}</h1></div>
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

    const p = document.createElement("p");
    p.className = "counter-text";
    p.textContent = t("sportsHub.home.subtitle");
    wrapper.appendChild(p);

    const grid = document.createElement("div");
    grid.className = "sports-grid";
    SPORTS.forEach((sport) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "sport-card" + (sport.enabled ? "" : " disabled");
      card.innerHTML = `
        <span class="sport-card-icon">${sport.icon}</span>
        <span class="sport-card-name" dir="auto">${getLang() === "en" ? sport.nameEn : sport.nameHe}</span>
        ${!sport.enabled ? `<span class="coming-soon-badge">${t("sportsHub.comingSoon")}</span>` : ""}
      `;
      card.addEventListener("click", () => this.onSelectSport(sport.id));
      grid.appendChild(card);
    });
    wrapper.appendChild(grid);

    this.container.appendChild(wrapper);
  }
}
