import { sportById, LEAGUES_BY_SPORT } from "./sportsData";
import { t, getLang } from "../i18n/i18n";
import { screenHeader, emptyState } from "../ui/ScreenHeader";
import { icon, sportIcon } from "../ui/icons";

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
    const header = screenHeader({ title: title, onBack: () => this.onBack() });
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
    wrapper.className = "screen";
    wrapper.appendChild(
      this.renderHeader(t("sportsHub.leagues.title", { sport: sportName })),
    );

    const leagues = LEAGUES_BY_SPORT[this.sportId] ?? [];
    if (leagues.length === 0) {
      wrapper.appendChild(emptyState(t("sportsHub.leagues.none")));
      this.container.appendChild(wrapper);
      return;
    }

    const list = document.createElement("div");
    list.className = "list";
    leagues.forEach((league) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "list-row" + (league.enabled ? "" : " is-disabled");
      card.disabled = !league.enabled;
      card.innerHTML = `
        <span class="list-row__icon">${sportIcon(this.sportId)}</span>
        <span class="list-row__main"><span class="list-row__title" dir="auto">${getLang() === "en" ? league.nameEn : league.nameHe}</span></span>
        ${!league.enabled ? `<span class="tag">${t("sportsHub.comingSoon")}</span>` : icon("chevronForward", { size: "sm", className: "c-3" })}
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
