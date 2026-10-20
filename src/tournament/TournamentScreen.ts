import { getTournamentLeaderboard, type LeaderboardRow } from "../api/backend";
import {
  KIPA_ADUMA_100_OPPONENT_IDS,
  KIPA_ADUMA_100_PRIZE,
} from "../schedule/schedule";
import { TEAMS, teamName } from "../schedule/teams";
import { t, tDynamic } from "../i18n/i18n";

/** Special one-off tournament screen - fixed set of 6 games, same scoring rules, real-world prize. */
export class TournamentScreen {
  private container: HTMLElement;
  private onBack: () => void;

  constructor(container: HTMLElement, onBack: () => void) {
    this.container = container;
    this.onBack = onBack;
  }

  async show() {
    this.container.classList.remove("hidden");
    this.renderLoading();
    try {
      const { overall } = await getTournamentLeaderboard();
      this.render(overall);
    } catch (err) {
      console.error("Failed to load tournament leaderboard:", err);
      this.renderError();
    }
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private renderHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "prediction-header";
    header.innerHTML = `
      <button class="btn-back" type="button">&rarr; ${t("common.back")}</button>
      <div class="prediction-title"><h1>${t("tournament.title")}</h1></div>
      <div class="prediction-header-spacer"></div>
    `;
    header
      .querySelector(".btn-back")
      ?.addEventListener("click", () => this.onBack());
    return header;
  }

  private renderHero(): HTMLElement {
    const hero = document.createElement("div");
    hero.className = "tournament-hero";

    const teamsHtml = KIPA_ADUMA_100_OPPONENT_IDS.map((id) => TEAMS[id])
      .filter(Boolean)
      .map(
        (team) => `
        <div class="tournament-hero-team">
          <img src="${team.logo}" alt="${teamName(team)}" />
          <span dir="auto">${teamName(team)}</span>
        </div>`,
      )
      .join("");

    hero.innerHTML = `
      <span class="tournament-hero-badge">${t("tournament.badge")}</span>
      <p class="tournament-hero-desc">
        ${t("tournament.desc")}
      </p>
      <div class="tournament-hero-teams">${teamsHtml}</div>
      <div class="tournament-hero-prize">
        <span class="tournament-hero-prize-icon">🏆</span>
        <span>${t("tournament.prize", { prize: tDynamic(KIPA_ADUMA_100_PRIZE) })}</span>
      </div>
    `;
    return hero;
  }

  private renderLoading() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());
    const p = document.createElement("p");
    p.className = "counter-text";
    p.textContent = t("tournament.loading");
    wrapper.appendChild(p);
    this.container.appendChild(wrapper);
  }

  private renderError() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());
    const p = document.createElement("p");
    p.className = "counter-text";
    p.textContent = t("tournament.error");
    wrapper.appendChild(p);
    this.container.appendChild(wrapper);
  }

  private render(rows: LeaderboardRow[]) {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());
    wrapper.appendChild(this.renderHero());

    if (rows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "counter-text";
      empty.textContent = t("tournament.empty");
      wrapper.appendChild(empty);
    } else {
      wrapper.appendChild(this.renderTable(rows));
    }

    this.container.appendChild(wrapper);
  }

  private renderTable(rows: LeaderboardRow[]): HTMLElement {
    const section = document.createElement("div");
    section.className = "leaderboard-table-section";

    const table = document.createElement("div");
    table.className = "leaderboard-table";
    rows.forEach((row, i) => {
      const rowEl = document.createElement("div");
      rowEl.className = "leaderboard-row" + (i === 0 ? " leader" : "");
      rowEl.innerHTML = `
        <span class="leaderboard-rank">#${i + 1}</span>
        <span class="leaderboard-name" dir="auto">${row.name}</span>
        <span class="leaderboard-score">${row.total}</span>
      `;
      table.appendChild(rowEl);
    });
    section.appendChild(table);

    return section;
  }
}
