import "./sportsHub.css";
import { sportById, LEAGUES_BY_SPORT } from "./sportsData";
import { t, getLang } from "../i18n/i18n";

/** Step 2 of the drill-down: pick a league/competition within the chosen sport. */
export class LeaguesScreen {
  private container: HTMLElement;
  private onBack: () => void;
  private onSelectLeague: (sportId: string, leagueId: string) => void;
  private sportId = "";

  constructor(
    container: HTMLElement,
    onBack: () => void,
    onSelectLeague: (sportId: string, leagueId: string) => void,
  ) {
    this.container = container;
    this.onBack = onBack;
    this.onSelectLeague = onSelectLeague;

    window.addEventListener("langchange", () => {
      if (!this.container.classList.contains("hidden")) this.render();
    });
  }

  show(sportId: string) {
    this.sportId = sportId;
    this.container.classList.remove("hidden");
    this.render();
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private renderHeader(title: string): HTMLElement {
    const header = document.createElement("div");
    header.className = "sh-header";
    header.innerHTML = `
      <button type="button" class="sh-back-btn">&rarr; ${t("common.back")}</button>
      <div class="sh-header-title sh-display" dir="auto">${title}</div>
      <div style="width:70px;"></div>
    `;
    header
      .querySelector(".sh-back-btn")
      ?.addEventListener("click", () => this.onBack());
    return header;
  }

  private render() {
    const sport = sportById(this.sportId);
    const sportName = sport
      ? getLang() === "en"
        ? sport.nameEn
        : sport.nameHe
      : "";

    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "sports-hub-screen";

    const grid = document.createElement("div");
    grid.className = "sh-cyber-grid";
    wrapper.appendChild(grid);

    wrapper.appendChild(
      this.renderHeader(t("sportsHub.leagues.title", { sport: sportName })),
    );

    const content = document.createElement("div");
    content.className = "sh-content";

    const leagues = LEAGUES_BY_SPORT[this.sportId] ?? [];
    if (leagues.length === 0) {
      const p = document.createElement("p");
      p.className = "sh-empty-text";
      p.textContent = t("sportsHub.leagues.none");
      content.appendChild(p);
      wrapper.appendChild(content);
      this.container.appendChild(wrapper);
      return;
    }

    leagues.forEach((league) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "sh-hologram-card" + (league.enabled ? "" : " disabled");
      card.innerHTML = `
        <span class="sh-card-name" dir="auto">${getLang() === "en" ? league.nameEn : league.nameHe}</span>
        ${!league.enabled ? `<span class="sh-badge">${t("sportsHub.comingSoon")}</span>` : ""}
      `;
      if (league.enabled) {
        card.addEventListener("click", () =>
          this.onSelectLeague(this.sportId, league.id),
        );
      }
      content.appendChild(card);
    });

    wrapper.appendChild(content);
    this.container.appendChild(wrapper);
  }
}
