import { SPORTS } from "./sportsData";
import { t, getLang } from "../i18n/i18n";
import { screenHeader } from "../ui/ScreenHeader";
import { sportIcon } from "../ui/icons";

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
    const header = screenHeader({
      title: t("sportsHub.home.title"),
      subtitle: t("sportsHub.home.subtitle"),
      onBack: () => this.onBack(),
    });
    return header;
  }

  private render() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "screen";
    wrapper.appendChild(this.renderHeader());


    const grid = document.createElement("div");
    grid.className = "sports-grid";
    SPORTS.forEach((sport) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "sport-card" + (sport.enabled ? "" : " is-disabled");
      card.innerHTML = `
        <span class="sport-card__icon">${sportIcon(sport.id, "lg")}</span>
        <span class="sport-card__name" dir="auto">${getLang() === "en" ? sport.nameEn : sport.nameHe}</span>
        ${!sport.enabled ? `<span class="tag">${t("sportsHub.comingSoon")}</span>` : ""}
      `;
      card.addEventListener("click", () => this.onSelectSport(sport.id));
      grid.appendChild(card);
    });
    wrapper.appendChild(grid);

    this.container.appendChild(wrapper);
  }
}
