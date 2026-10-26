import type { LeagueInfo } from "../api/backend";
import { auth, onAuthChange } from "../firebase/firebase";
import { t } from "../i18n/i18n";
import { CHALLENGE_FEATURE_ENABLED } from "../config/GameConfig";
import { screenHeader } from "../ui/ScreenHeader";
import { icon } from "../ui/icons";
import { el, esc } from "../ui/dom";

/**
 * "Leagues & challenges" tab: the user's private leagues (each opens its
 * table), creating a league, the VIP tournament and - when the feature is
 * on - "my challenges". Pure navigation; every action reuses an existing
 * screen or modal.
 */
export class LeaguesHubScreen {
  private container: HTMLElement;
  private leagues: LeagueInfo[] = [];
  private actions: {
    onBack: () => void;
    onOpenLeague: (league: LeagueInfo) => void;
    onCreateLeague: () => void;
    onOpenTournament: () => void;
    onOpenMyChallenges: () => void;
    onSignIn: () => void;
  };

  constructor(container: HTMLElement, actions: LeaguesHubScreen["actions"]) {
    this.container = container;
    this.actions = actions;
    onAuthChange(() => {
      if (!this.container.classList.contains("hidden")) this.render();
    });
    window.addEventListener("langchange", () => {
      if (!this.container.classList.contains("hidden")) this.render();
    });
  }

  setLeagues(leagues: LeagueInfo[]) {
    this.leagues = leagues;
    if (!this.container.classList.contains("hidden")) this.render();
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
    const page = el("div", "screen leagues-hub");
    page.appendChild(
      screenHeader({
        title: t("leaguesHub.title"),
        subtitle: t("leaguesHub.subtitle"),
        onBack: this.actions.onBack,
      }),
    );

    // My leagues
    const mine = el("section", "leagues-hub__section");
    mine.innerHTML = `<div class="section-head"><h2>${t("leaguesHub.mine")}</h2></div>`;

    if (!auth.currentUser) {
      const card = el(
        "div",
        "card signin-card",
        `<div class="signin-card__text"><h3 class="t-h3">${t("home.signInCard.title")}</h3><p class="c-2 t-small">${t("leaguesHub.signInText")}</p></div>`,
      );
      const b = el("button", "btn btn--primary btn--block", `${icon("logIn", { className: "icon--dir" })}<span>${t("home.signIn")}</span>`);
      b.type = "button";
      b.addEventListener("click", () => this.actions.onSignIn());
      card.appendChild(b);
      mine.appendChild(card);
    } else {
      if (this.leagues.length === 0) {
        mine.appendChild(
          el("div", "empty-state", `${icon("users", { size: "lg" })}<p>${t("leaguesHub.empty")}</p>`),
        );
      } else {
        const list = el("div", "list");
        this.leagues.forEach((league) => {
          const row = el(
            "button",
            "list-row",
            `<span class="list-row__icon">${icon("users")}</span>
             <span class="list-row__main"><span class="list-row__title" dir="auto">${esc(league.name)}</span>
             <span class="list-row__meta">${t("leaguesHub.openTable")}</span></span>
             ${icon("chevronForward", { size: "sm", className: "c-3" })}`,
          );
          row.type = "button";
          row.addEventListener("click", () => this.actions.onOpenLeague(league));
          list.appendChild(row);
        });
        mine.appendChild(list);
      }
      const create = el("button", "btn btn--primary btn--block leagues-hub__create", `${icon("plus")}<span>${t("home.menu.createLeague")}</span>`);
      create.type = "button";
      create.addEventListener("click", () => this.actions.onCreateLeague());
      mine.appendChild(create);
    }
    page.appendChild(mine);

    // Competitions
    const comps = el("section", "section leagues-hub__section");
    comps.innerHTML = `<div class="section-head"><h2>${t("leaguesHub.competitions")}</h2></div>`;
    const list = el("div", "list");
    const vip = el(
      "button",
      "list-row",
      `<span class="list-row__icon list-row__icon--gold">${icon("ticket")}</span>
       <span class="list-row__main"><span class="list-row__title">${t("home.tournamentTitle")}</span>
       <span class="list-row__meta">${t("home.tournamentDesc")}</span></span>
       ${icon("chevronForward", { size: "sm", className: "c-3" })}`,
    );
    vip.type = "button";
    vip.addEventListener("click", () => this.actions.onOpenTournament());
    list.appendChild(vip);

    if (CHALLENGE_FEATURE_ENABLED && auth.currentUser) {
      const ch = el(
        "button",
        "list-row",
        `<span class="list-row__icon">${icon("zap")}</span>
         <span class="list-row__main"><span class="list-row__title">${t("home.menu.myChallenges")}</span></span>
         ${icon("chevronForward", { size: "sm", className: "c-3" })}`,
      );
      ch.type = "button";
      ch.addEventListener("click", () => this.actions.onOpenMyChallenges());
      list.appendChild(ch);
    }
    comps.appendChild(list);
    page.appendChild(comps);

    this.container.appendChild(page);
  }
}
