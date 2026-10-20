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
    header.className = "prediction-header";
    header.innerHTML = `
      <button class="btn-back" type="button">&rarr; ${t("common.back")}</button>
      <div class="prediction-title"><h1 dir="auto">${title}</h1></div>
      <div class="prediction-header-spacer"></div>
    `;
    header
      .querySelector(".btn-back")
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
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(
      this.renderHeader(t("sportsHub.leagues.title", { sport: sportName })),
    );

    const leagues = LEAGUES_BY_SPORT[this.sportId] ?? [];
    if (leagues.length === 0) {
      const p = document.createElement("p");
      p.className = "counter-text";
      p.textContent = t("sportsHub.leagues.none");
      wrapper.appendChild(p);
      this.container.appendChild(wrapper);
      return;
    }

    const list = document.createElement("div");
    list.className = "sports-league-list";
    leagues.forEach((league) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "sport-league-card" + (league.enabled ? "" : " disabled");
      card.innerHTML = `
        <span dir="auto">${getLang() === "en" ? league.nameEn : league.nameHe}</span>
        ${!league.enabled ? `<span class="coming-soon-badge">${t("sportsHub.comingSoon")}</span>` : ""}
      `;
      if (league.enabled) {
        card.addEventListener("click", () =>
          this.onSelectLeague(this.sportId, league.id),
        );
      }
      list.appendChild(card);
    });
    wrapper.appendChild(list);

    this.container.appendChild(wrapper);
  }
}
