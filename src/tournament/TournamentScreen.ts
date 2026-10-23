import { getTournamentLeaderboard, type LeaderboardRow } from "../api/backend";
import {
  KIPA_ADUMA_100_OPPONENT_IDS,
  KIPA_ADUMA_100_PRIZE,
} from "../schedule/schedule";
import { TEAMS, teamName } from "../schedule/teams";
import { t, tDynamic } from "../i18n/i18n";
import { auth } from "../firebase/firebase";
import { screenHeader, skeleton, emptyState } from "../ui/ScreenHeader";
import { rankList } from "../ui/RankList";
import { icon } from "../ui/icons";
import { el, esc } from "../ui/dom";

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

  private page(): HTMLElement {
    this.container.innerHTML = "";
    const page = el("div", "screen tournament");
    page.appendChild(screenHeader({ title: t("tournament.title"), onBack: () => this.onBack(), photo: "vip-tournament" }));
    this.container.appendChild(page);
    return page;
  }

  private renderHero(): HTMLElement {
    const hero = el("section", "ticket ticket--hero");

    const teamsHtml = KIPA_ADUMA_100_OPPONENT_IDS.map((id) => TEAMS[id])
      .filter(Boolean)
      .map(
        (team) => `
        <li class="ticket__team">
          <img src="${team.logo}" alt="" width="40" height="40" loading="lazy" />
          <span dir="auto">${esc(teamName(team))}</span>
        </li>`,
      )
      .join("");

    hero.innerHTML = `
      <div class="ticket__body">
        <span class="tag tag--gold">${icon("ticket")}${t("tournament.badge")}</span>
        <p class="ticket__desc c-2">${t("tournament.desc")}</p>
        <ul class="ticket__teams">${teamsHtml}</ul>
      </div>
      <div class="ticket__stub">
        <p class="ticket__prize">${icon("trophy")}<span dir="auto">${esc(t("tournament.prize", { prize: tDynamic(KIPA_ADUMA_100_PRIZE) }))}</span></p>
      </div>
    `;
    return hero;
  }

  private renderLoading() {
    this.page().appendChild(skeleton("list", 6));
  }

  private renderError() {
    this.page().appendChild(emptyState(t("tournament.error"), "error"));
  }

  private render(rows: LeaderboardRow[]) {
    const page = this.page();
    page.appendChild(this.renderHero());

    const section = el("section", "section tournament__table");
    section.innerHTML = `<div class="section-head"><h2>${t("tournament.tableTitle")}</h2></div>`;
    if (rows.length === 0) {
      section.appendChild(emptyState(t("tournament.empty")));
    } else {
      section.appendChild(rankList(rows, { meUid: auth.currentUser?.uid }));
    }
    page.appendChild(section);
  }
}
