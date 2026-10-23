import type { Player, GamePrediction } from "./types";
import { EMPTY_PREDICTION } from "./types";
import type { ScheduleGame, BonusQuestion } from "../schedule/schedule";
import { BONUS_QUESTIONS } from "../schedule/schedule";
import {
  TEAMS,
  HAPOEL_JERUSALEM_TEAM_ID,
  teamName,
  type Team,
} from "../schedule/teams";
import { auth, signInWithGoogle } from "../firebase/firebase";
import { isScoreLocked } from "./lock";
import {
  submitPrediction,
  getMyPrediction,
  getPredictionsAggregate,
  getGameResult,
  getScoringRules,
  getGameSquad,
  type PredictionsAggregate,
  type GameResultData,
  type ScoringRules,
} from "../api/backend";

import { t, tDynamic } from "../i18n/i18n";
import { screenHeader, skeleton } from "../ui/ScreenHeader";
import { numberStepper } from "../ui/Stepper";
import { icon } from "../ui/icons";
import { el, esc, initials } from "../ui/dom";
import { logoMarkSVG } from "../brand/Logo";

type StepKey = "score" | "stats" | "team" | "summary";
export type StatCategory = "scorer" | "rebounder" | "assist";
type CarouselKey = StatCategory;

const STEP_LABEL_KEYS: Record<StepKey, string> = {
  score: "prediction.step.score",
  stats: "prediction.step.stats",
  team: "prediction.step.team",
  summary: "prediction.step.summary",
};

const CATEGORY_ORDER: StatCategory[] = ["scorer", "rebounder", "assist"];
export { CATEGORY_ORDER };

export const CATEGORY_CONFIG: Record<
  StatCategory,
  {
    labelKey: string;
    playerKey:
      | "topScorerPlayerId"
      | "topRebounderPlayerId"
      | "topAssistPlayerId";
    amountKey: "topScorerPoints" | "topRebounds" | "topAssists";
    amountLabelKey: string;
    actualPlayerKey:
      | "actualTopScorerPlayerId"
      | "actualTopRebounderPlayerId"
      | "actualTopAssistPlayerId";
    actualAmountKey:
      | "actualTopScorerPoints"
      | "actualTopRebounds"
      | "actualTopAssists";
  }
> = {
  scorer: {
    labelKey: "prediction.category.scorer",
    playerKey: "topScorerPlayerId",
    amountKey: "topScorerPoints",
    amountLabelKey: "prediction.category.scorer.amount",
    actualPlayerKey: "actualTopScorerPlayerId",
    actualAmountKey: "actualTopScorerPoints",
  },
  rebounder: {
    labelKey: "prediction.category.rebounder",
    playerKey: "topRebounderPlayerId",
    amountKey: "topRebounds",
    amountLabelKey: "prediction.category.rebounder.amount",
    actualPlayerKey: "actualTopRebounderPlayerId",
    actualAmountKey: "actualTopRebounds",
  },
  assist: {
    labelKey: "prediction.category.assist",
    playerKey: "topAssistPlayerId",
    amountKey: "topAssists",
    amountLabelKey: "prediction.category.assist.amount",
    actualPlayerKey: "actualTopAssistPlayerId",
    actualAmountKey: "actualTopAssists",
  },
};

// Sanity caps so a mistyped/absurd guess can't skew the aggregate stats
// shown to everyone else. Matches the backend's PredictionBody validation.
const MAX_TEAM_SCORE = 150;
const MAX_PLAYER_STAT: Record<StatCategory, number> = {
  scorer: 50,
  rebounder: 30,
  assist: 30,
};
const MAX_TEAM_STAT = {
  predictedTeamThrees: 30,
  predictedTeamRebounds: 80,
  predictedTeamAssists: 60,
};

// Client-side mirror of HapoelJerusalemBackend/scoring.py, used only to show
// a per-row points breakdown in the post-game recap - the real/authoritative
// total score always comes from the server (myGameScore).
function tieredPoints(
  predicted: number,
  actual: number,
  exact: number,
  closeRange: number,
  close: number,
): number {
  const diff = Math.abs(predicted - actual);
  if (diff === 0) return exact;
  if (diff <= closeRange) return close;
  return 0;
}

export function topStatPoints(
  predictedPlayerId: string | null,
  predictedAmount: number | null,
  actualPlayerId: string | null,
  actualAmount: number | null,
  rules: ScoringRules,
): number {
  if (
    !predictedPlayerId ||
    !actualPlayerId ||
    predictedPlayerId !== actualPlayerId
  )
    return 0;
  let total = rules.topStatPlayerPoints;
  if (predictedAmount !== null && actualAmount !== null) {
    total += tieredPoints(
      predictedAmount,
      actualAmount,
      rules.topStatExactPoints,
      rules.topStatCloseRange,
      rules.topStatClosePoints,
    );
  }
  return total;
}

export function finalScorePoints(
  pHome: number,
  pAway: number,
  aHome: number,
  aAway: number,
  rules: ScoringRules,
): number {
  if (pHome === aHome && pAway === aAway) return rules.finalScoreExactPoints;
  const predictedWinner =
    pHome > pAway ? "home" : pAway > pHome ? "away" : "tie";
  const actualWinner = aHome > aAway ? "home" : aAway > aHome ? "away" : "tie";
  if (predictedWinner !== actualWinner) return 0;
  const marginDiff = Math.abs(pHome - pAway - (aHome - aAway));
  if (marginDiff === 0) return rules.finalScoreMarginPoints;
  if (marginDiff <= rules.finalScoreCloseMarginRange)
    return rules.finalScoreCloseMarginPoints;
  return rules.finalScoreDirectionPoints;
}

export function teamStatPoints(
  predicted: number,
  actual: number,
  rules: ScoringRules,
): number {
  return tieredPoints(
    predicted,
    actual,
    rules.teamStatExactPoints,
    rules.teamStatCloseRange,
    rules.teamStatClosePoints,
  );
}

/** Team-score stepper starts here on the first +/− tap - a realistic basketball score. */
const SCORE_STEPPER_START = 80;

/**
 * Prediction flow:
 * 1) The final score (with both team logos).
 * 2) "Personal questions" - who will lead the team in points/rebounds/assists,
 *    and by how much - one category per screen, picked from a player grid.
 * 3) Team-level totals: made threes, rebounds, assists (+ optional bonus question).
 * 4) Review & submit (saved via the backend API under the signed-in user).
 *
 * Layout: compact header, thin 4-segment progress, one question per screen,
 * and a sticky action bar (back as text, next as the single red CTA).
 */
export class PredictionScreen {
  private container: HTMLElement;
  private players: Player[];
  private onBack: () => void;
  private onSubmitted?: () => void;

  private steps: StepKey[] = ["score", "stats", "team", "summary"];
  private stepIndex = 0;
  private statSubStep = 0;
  /** Index into `players` of the picked player per category (was the carousel position). */
  private carouselIndex: Record<CarouselKey, number> = {
    scorer: 0,
    rebounder: 0,
    assist: 0,
  };
  private lastDirection: 1 | -1 = 1;
  private animatePanel = false;
  private currentGame: ScheduleGame | null = null;
  private prediction: GamePrediction = { ...EMPTY_PREDICTION };
  private viewMode = false;
  private hasOwnPrediction = false;
  private loading = false;
  private aggregate: PredictionsAggregate | null = null;
  private actualResult: GameResultData | null = null;
  private scoringRules: ScoringRules | null = null;
  private myGameScore: number | null = null;
  private squadPlayerIds: Set<string> | null = null;

  constructor(
    container: HTMLElement,
    onBack: () => void,
    players: Player[] = [],
    onSubmitted?: () => void,
  ) {
    this.container = container;
    this.players = players;
    this.onBack = onBack;
    this.onSubmitted = onSubmitted;
  }

  setPlayers(players: Player[]) {
    this.players = players;
  }

  async show(game: ScheduleGame) {
    this.currentGame = game;
    this.steps = ["score", "stats", "team", "summary"];
    this.stepIndex = 0;
    this.statSubStep = 0;
    this.carouselIndex = {
      scorer: 0,
      rebounder: 0,
      assist: 0,
    };
    this.lastDirection = 1;
    this.prediction = { ...EMPTY_PREDICTION };
    // A finished game is always view-only, whether or not the visitor is signed in.
    this.viewMode = !!game.result;
    this.hasOwnPrediction = false;
    this.aggregate = null;
    this.actualResult = null;
    this.scoringRules = null;
    this.myGameScore = null;
    this.squadPlayerIds = null;
    this.loading = !!auth.currentUser || !!game.result;
    this.container.classList.remove("hidden");
    this.render();

    if (!game.result) {
      getGameSquad(game.id)
        .then((ids) => {
          if (this.currentGame?.id === game.id && ids.length > 0) {
            this.squadPlayerIds = new Set(ids);
            this.render();
          }
        })
        .catch((err) => console.warn("Could not load game squad:", err));
    }

    if (auth.currentUser) {
      try {
        const existing = await getMyPrediction(game.id);
        if (existing && this.currentGame?.id === game.id) {
          this.prediction = {
            predictedForeignPlayerIds: existing.predictedForeignPlayerIds,
            topScorerPlayerId: existing.topScorerPlayerId,
            topScorerPoints: existing.topScorerPoints,
            topRebounderPlayerId: existing.topRebounderPlayerId,
            topRebounds: existing.topRebounds,
            topAssistPlayerId: existing.topAssistPlayerId,
            topAssists: existing.topAssists,
            predictedHomeScore: existing.predictedHomeScore,
            predictedAwayScore: existing.predictedAwayScore,
            predictedTeamThrees: existing.predictedTeamThrees,
            predictedTeamRebounds: existing.predictedTeamRebounds,
            predictedTeamAssists: existing.predictedTeamAssists,
            predictedBonusAnswer: existing.predictedBonusAnswer,
          };
          this.syncPickedPlayersFromPrediction();
          this.viewMode = true;
          this.hasOwnPrediction = true;
          this.myGameScore = existing.score;
        } else if (game.result) {
          this.viewMode = true;
        }
      } catch (err) {
        console.warn("Could not load existing prediction:", err);
      }
    }

    if (this.viewMode) {
      try {
        this.aggregate = await getPredictionsAggregate(game.id);
      } catch (err) {
        console.warn("Could not load predictions aggregate:", err);
      }

      if (game.result) {
        try {
          [this.actualResult, this.scoringRules] = await Promise.all([
            getGameResult(game.id),
            getScoringRules(),
          ]);
        } catch (err) {
          console.warn("Could not load game result/scoring rules:", err);
        }
      }
    }

    this.loading = false;
    this.render();
  }

  hide() {
    this.container.classList.add("hidden");
  }

  /**
   * When editing a saved prediction, start each player grid on the player that
   * was actually picked (the old carousel always reset to the first player,
   * which silently replaced the saved pick unless the user scrolled back).
   */
  private syncPickedPlayersFromPrediction() {
    CATEGORY_ORDER.forEach((category) => {
      const id = this.prediction[CATEGORY_CONFIG[category].playerKey];
      const index = id ? this.players.findIndex((p) => p.id === id) : -1;
      if (index >= 0) this.carouselIndex[category] = index;
    });
  }

  private playerById(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  // ---------------------------------------------------------------- shell

  private render() {
    this.container.innerHTML = "";

    const page = el("div", "screen prediction");
    page.appendChild(this.renderHeader());

    if (this.loading) {
      page.appendChild(skeleton("text", 4));
      this.container.appendChild(page);
      return;
    }

    if (this.viewMode) {
      const panel = this.renderViewOnlyStep();
      panel.classList.add("step-panel");
      page.appendChild(panel);
      page.classList.add("has-action-bar");
      this.container.appendChild(page);
      this.container.appendChild(this.renderViewOnlyActions());
      return;
    }

    page.appendChild(this.renderStepIndicator());

    const key = this.steps[this.stepIndex];
    let panel: HTMLElement;
    let actions: HTMLElement;
    if (key === "score") [panel, actions] = this.renderScoreStep();
    else if (key === "stats") [panel, actions] = this.renderStatsStep();
    else if (key === "team") [panel, actions] = this.renderTeamStep();
    else [panel, actions] = this.renderSummaryStep();

    panel.classList.add("step-panel");
    if (this.animatePanel) {
      panel.classList.add(
        this.lastDirection === 1 ? "slide-forward" : "slide-back",
      );
      this.animatePanel = false;
    }
    page.appendChild(panel);
    page.classList.add("has-action-bar");

    this.container.appendChild(page);
    this.container.appendChild(actions);
  }

  private renderHeader(): HTMLElement {
    const opponentId = this.currentGame
      ? this.currentGame.homeTeamId === HAPOEL_JERUSALEM_TEAM_ID
        ? this.currentGame.awayTeamId
        : this.currentGame.homeTeamId
      : null;
    const opponent = opponentId ? TEAMS[opponentId] : null;
    const subtitle =
      opponent && this.currentGame
        ? t("prediction.header.subtitle", {
            opponent: teamName(opponent),
            date: this.currentGame.date,
          })
        : teamName(TEAMS[HAPOEL_JERUSALEM_TEAM_ID]);

    const header = screenHeader({
      title: t("prediction.header.title"),
      subtitle,
      onBack: () => this.onBack(),
    });
    header.classList.add("screen-header--compact");
    return header;
  }

  private renderStepIndicator(): HTMLElement {
    const total = this.steps.length;
    const current = this.stepIndex + 1;
    const nav = el("div", "progress");
    nav.setAttribute("role", "progressbar");
    nav.setAttribute("aria-valuemin", "1");
    nav.setAttribute("aria-valuemax", String(total));
    nav.setAttribute("aria-valuenow", String(current));
    nav.setAttribute("aria-valuetext", t(STEP_LABEL_KEYS[this.steps[this.stepIndex]]));

    const bars = el("div", "progress__bars");
    this.steps.forEach((_, i) => {
      bars.appendChild(
        el("span", `progress__bar${i < this.stepIndex ? " is-done" : i === this.stepIndex ? " is-active" : ""}`),
      );
    });
    nav.appendChild(bars);

    const label = el("p", "progress__label");
    label.innerHTML = `<span class="num">${t("prediction.progress", { n: current, total })}</span><span aria-hidden="true">·</span><span></span>`;
    label.lastElementChild!.textContent = t(STEP_LABEL_KEYS[this.steps[this.stepIndex]]);
    nav.appendChild(label);
    return nav;
  }

  private goNext() {
    if (
      this.steps[this.stepIndex] === "stats" &&
      this.statSubStep < CATEGORY_ORDER.length - 1
    ) {
      this.lastDirection = 1;
      this.animatePanel = true;
      this.statSubStep += 1;
      this.render();
      window.scrollTo({ top: 0 });
      return;
    }
    this.lastDirection = 1;
    this.animatePanel = true;
    this.stepIndex = Math.min(this.stepIndex + 1, this.steps.length - 1);
    if (this.steps[this.stepIndex] === "stats") this.statSubStep = 0;
    this.render();
    window.scrollTo({ top: 0 });
  }

  private goBack() {
    if (this.steps[this.stepIndex] === "stats" && this.statSubStep > 0) {
      this.lastDirection = -1;
      this.animatePanel = true;
      this.statSubStep -= 1;
      this.render();
      window.scrollTo({ top: 0 });
      return;
    }
    if (this.stepIndex === 0) {
      this.onBack();
      return;
    }
    this.lastDirection = -1;
    this.animatePanel = true;
    this.stepIndex -= 1;
    if (this.steps[this.stepIndex] === "stats")
      this.statSubStep = CATEGORY_ORDER.length - 1;
    this.render();
    window.scrollTo({ top: 0 });
  }

  /** Label for the "next" button when leaving the current top-level step. */
  private nextStepLabel(): string {
    const nextKey = this.steps[this.stepIndex + 1];
    if (!nextKey || nextKey === "summary") return t("prediction.nav.toSummary");
    return t("prediction.nav.next", { label: t(STEP_LABEL_KEYS[nextKey]) });
  }

  private question(text: string): HTMLElement {
    const h = el("h2", "step-question");
    h.dir = "auto";
    h.textContent = text;
    return h;
  }

  // ---------------------------------------------------------------- step 1: final score

  private renderScoreStep(): [HTMLElement, HTMLElement] {
    const section = el("section", "prediction-section");
    section.appendChild(this.question(t("prediction.scoreStep.question")));

    const home = this.currentGame ? TEAMS[this.currentGame.homeTeamId] : null;
    const away = this.currentGame ? TEAMS[this.currentGame.awayTeamId] : null;

    let homeValid = true;
    let awayValid = true;
    let nextBtn: HTMLButtonElement | null = null;
    const updateNextState = () => {
      if (nextBtn) nextBtn.disabled = !(homeValid && awayValid);
    };

    const buildTeamRow = (
      team: Team | null,
      value: number | null,
      onInput: (value: number | null) => void,
      onValidityChange: (valid: boolean) => void,
    ) => {
      const row = el("div", "score-row");
      row.innerHTML = `
        <div class="score-row__team">
          ${team ? `<img class="score-row__logo" src="${team.logo}" alt="" width="48" height="48" />` : ""}
          <span class="score-row__name t-h3" dir="auto">${team ? esc(teamName(team)) : ""}</span>
        </div>`;
      const { root, error } = numberStepper({
        value,
        max: MAX_TEAM_SCORE,
        emptyStart: SCORE_STEPPER_START,
        label: team ? teamName(team) : "",
        onValue: (v, valid) => {
          onInput(v);
          onValidityChange(valid);
        },
      });
      const control = el("div", "score-row__control");
      control.append(root, error);
      row.appendChild(control);
      return row;
    };

    const card = el("div", "card card--lg score-card");
    card.appendChild(
      buildTeamRow(
        home,
        this.prediction.predictedHomeScore,
        (v) => {
          this.prediction.predictedHomeScore = v;
        },
        (valid) => {
          homeValid = valid;
          updateNextState();
        },
      ),
    );
    card.appendChild(
      buildTeamRow(
        away,
        this.prediction.predictedAwayScore,
        (v) => {
          this.prediction.predictedAwayScore = v;
        },
        (valid) => {
          awayValid = valid;
          updateNextState();
        },
      ),
    );
    section.appendChild(card);

    const nav = this.buildNavButtons({
      backLabel: t("common.backBtn"),
      onBack: () => this.goBack(),
      nextLabel: this.nextStepLabel(),
      nextEnabled: true,
      onNext: () => this.goNext(),
    });
    nextBtn = nav.querySelector(".btn--primary") as HTMLButtonElement | null;

    return [section, nav];
  }

  // ---------------------------------------------------------------- step 2: team leaders

  private renderStatsStep(): [HTMLElement, HTMLElement] {
    const category = CATEGORY_ORDER[this.statSubStep];
    const config = CATEGORY_CONFIG[category];

    const section = el("section", "prediction-section");

    const sub = el("div", "substeps");
    sub.innerHTML = `<span class="overline">${t(config.labelKey)}</span>`;
    const dots = el("span", "substeps__dots");
    CATEGORY_ORDER.forEach((_, i) => {
      dots.appendChild(
        el(
          "span",
          "substeps__dot" +
            (i === this.statSubStep ? " is-active" : i < this.statSubStep ? " is-done" : ""),
        ),
      );
    });
    sub.appendChild(dots);
    section.appendChild(sub);

    section.appendChild(
      this.question(t("prediction.statsStep.question", { label: t(config.labelKey) })),
    );

    let nextBtn: HTMLButtonElement | null = null;
    let amountValid = true;
    const updateNextState = () => {
      if (nextBtn) nextBtn.disabled = !amountValid;
    };

    if (this.players.length === 0) {
      section.appendChild(skeleton("cards", 2));
    } else {
      const index = this.carouselIndex[category] % this.players.length;
      const player = this.players[index];
      if (this.prediction[config.playerKey] !== player.id) {
        this.prediction[config.playerKey] = player.id;
      }

      if (this.squadPlayerIds && this.squadPlayerIds.size > 0) {
        section.appendChild(
          el("p", "squad-note", `${icon("info", { size: "sm" })}<span>${t("prediction.squadNote")}</span>`),
        );
      }

      section.appendChild(this.renderPlayerGrid(category));

      const amount = el("div", "card amount-card");
      const label = el("span", "amount-card__label t-h3");
      label.textContent = t(config.amountLabelKey);
      const { root, error } = numberStepper({
        value: this.prediction[config.amountKey],
        max: MAX_PLAYER_STAT[category],
        emptyStart: 0,
        label: t(config.amountLabelKey),
        size: "md",
        onValue: (v, valid) => {
          this.prediction[config.amountKey] = v;
          amountValid = valid;
          updateNextState();
        },
      });
      const control = el("div", "amount-card__control");
      control.append(root, error);
      amount.append(label, control);
      section.appendChild(amount);
    }

    const nav = this.buildNavButtons({
      backLabel: t("common.backBtn"),
      onBack: () => this.goBack(),
      nextLabel:
        this.statSubStep < CATEGORY_ORDER.length - 1
          ? t("prediction.nav.next", {
              label: t(
                CATEGORY_CONFIG[CATEGORY_ORDER[this.statSubStep + 1]].labelKey,
              ),
            })
          : this.nextStepLabel(),
      nextEnabled: true,
      onNext: () => this.goNext(),
    });
    nextBtn = nav.querySelector(".btn--primary") as HTMLButtonElement | null;

    return [section, nav];
  }

  /** Grid of player cards (photo or initials, number, name) - replaces the old 3-up carousel. */
  private renderPlayerGrid(category: CarouselKey): HTMLElement {
    const grid = el("div", "player-grid");
    grid.setAttribute("role", "radiogroup");
    grid.setAttribute("aria-label", t(CATEGORY_CONFIG[category].labelKey));
    const selected = this.carouselIndex[category] % this.players.length;

    this.players.forEach((player, index) => {
      const isSelected = index === selected;
      const inSquad = this.squadPlayerIds?.has(player.id) ?? null;
      const card = el(
        "button",
        "player-card" +
          (isSelected ? " is-selected" : "") +
          (inSquad === false ? " is-out" : ""),
      );
      card.type = "button";
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", String(isSelected));
      const name = tDynamic(player.name);
      card.innerHTML = `
        <span class="player-card__avatar">${
          player.photoUrl
            ? `<img src="${esc(player.photoUrl)}" alt="" loading="lazy" />`
            : `<span>${esc(initials(name))}</span>`
        }</span>
        <span class="player-card__number num">${player.jerseyNumber}</span>
        <span class="player-card__name" dir="auto">${esc(name)}</span>
        ${inSquad ? `<span class="player-card__squad">${t("prediction.inSquad")}</span>` : ""}
        <span class="player-card__check">${icon("check", { size: "sm" })}</span>
      `;
      card.addEventListener("click", () => {
        if (this.carouselIndex[category] === index) return;
        this.carouselIndex[category] = index;
        this.prediction[CATEGORY_CONFIG[category].playerKey] = player.id;
        const y = window.scrollY;
        this.render();
        window.scrollTo({ top: y });
        (this.container.querySelectorAll<HTMLElement>(".player-card")[index])?.focus({ preventScroll: true });
      });
      grid.appendChild(card);
    });
    return grid;
  }

  // ---------------------------------------------------------------- step 3: team totals

  private renderTeamStep(): [HTMLElement, HTMLElement] {
    const section = el("section", "prediction-section");
    section.appendChild(this.question(t("prediction.teamStep.question")));

    const fields: {
      labelKey: string;
      key:
        | "predictedTeamThrees"
        | "predictedTeamRebounds"
        | "predictedTeamAssists";
      max: number;
    }[] = [
      {
        labelKey: "prediction.teamStep.threes",
        key: "predictedTeamThrees",
        max: MAX_TEAM_STAT.predictedTeamThrees,
      },
      {
        labelKey: "prediction.teamStep.rebounds",
        key: "predictedTeamRebounds",
        max: MAX_TEAM_STAT.predictedTeamRebounds,
      },
      {
        labelKey: "prediction.teamStep.assists",
        key: "predictedTeamAssists",
        max: MAX_TEAM_STAT.predictedTeamAssists,
      },
    ];

    const validity: Record<string, boolean> = {
      predictedTeamThrees: true,
      predictedTeamRebounds: true,
      predictedTeamAssists: true,
    };
    let nextBtn: HTMLButtonElement | null = null;
    const updateNextState = () => {
      if (nextBtn) nextBtn.disabled = !Object.values(validity).every(Boolean);
    };

    const card = el("div", "card card--lg team-card");
    fields.forEach(({ labelKey, key, max }) => {
      const row = el("div", "team-row");
      const label = el("span", "team-row__label t-h3");
      label.textContent = t(labelKey);
      const { root, error } = numberStepper({
        value: this.prediction[key],
        max,
        emptyStart: 0,
        label: t(labelKey),
        size: "md",
        onValue: (v, valid) => {
          this.prediction[key] = v;
          validity[key] = valid;
          updateNextState();
        },
      });
      const control = el("div", "team-row__control");
      control.append(root, error);
      row.append(label, control);
      card.appendChild(row);
    });
    section.appendChild(card);

    const bonusQuestion = this.currentGame
      ? BONUS_QUESTIONS.get(this.currentGame.id)
      : undefined;
    if (bonusQuestion) {
      section.appendChild(this.buildBonusQuestionField(bonusQuestion));
    }

    const nav = this.buildNavButtons({
      backLabel: t("common.backBtn"),
      onBack: () => this.goBack(),
      nextLabel: this.nextStepLabel(),
      nextEnabled: true,
      onNext: () => this.goNext(),
    });
    nextBtn = nav.querySelector(".btn--primary") as HTMLButtonElement | null;

    return [section, nav];
  }

  /** The one-off yes/no bonus question field, only shown for specific games (see BONUS_QUESTIONS). */
  private buildBonusQuestionField(bonusQuestion: BonusQuestion): HTMLElement {
    const field = el("div", "card bonus-card");
    field.innerHTML = `
      <span class="tag tag--red">${icon("zap")}${t("admin.bonusQuestionLabel", { points: bonusQuestion.points })}</span>
      <p class="bonus-card__text t-h3" dir="auto">${esc(tDynamic(bonusQuestion.question))}</p>
    `;

    const buttons = el("div", "segmented bonus-card__choices");
    buttons.setAttribute("role", "group");

    const buildChoice = (label: string, value: boolean) => {
      const btn = el("button", "segmented__btn");
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(this.prediction.predictedBonusAnswer === value));
      btn.textContent = label;
      btn.addEventListener("click", () => {
        this.prediction.predictedBonusAnswer = value;
        const y = window.scrollY;
        this.render();
        window.scrollTo({ top: y });
      });
      return btn;
    };

    buttons.appendChild(buildChoice(t("common.yes"), true));
    buttons.appendChild(buildChoice(t("common.no"), false));
    field.appendChild(buttons);

    return field;
  }

  // ---------------------------------------------------------------- post-game recap

  /** Post-game recap: a table of predicted vs. actual, with the points each row earned. */
  private buildResultBreakdownTable(section: HTMLElement) {
    const result = this.actualResult!;
    const rules = this.scoringRules!;

    const heading = el("h2", "t-h2 recap-title");
    heading.textContent = t("prediction.breakdown.title");
    section.appendChild(heading);

    type Row = {
      label: string;
      predicted: string;
      actual: string;
      points: number;
    };
    const rows: Row[] = [];

    const pHome = this.prediction.predictedHomeScore;
    const pAway = this.prediction.predictedAwayScore;
    const aHome = result.actualHomeScore;
    const aAway = result.actualAwayScore;
    rows.push({
      label: t("prediction.step.score"),
      predicted: pHome !== null && pAway !== null ? `${pHome} - ${pAway}` : "-",
      actual: aHome !== null && aAway !== null ? `${aHome} - ${aAway}` : "-",
      points:
        pHome !== null && pAway !== null && aHome !== null && aAway !== null
          ? finalScorePoints(pHome, pAway, aHome, aAway, rules)
          : 0,
    });

    CATEGORY_ORDER.forEach((category) => {
      const config = CATEGORY_CONFIG[category];
      const predictedPlayerId = this.prediction[config.playerKey];
      const predictedAmount = this.prediction[config.amountKey];
      const actualPlayerId = result[config.actualPlayerKey];
      const actualAmount = result[config.actualAmountKey];
      const predictedPlayer = predictedPlayerId
        ? this.playerById(predictedPlayerId)
        : null;
      const actualPlayer = actualPlayerId
        ? this.playerById(actualPlayerId)
        : null;
      rows.push({
        label: t(config.labelKey),
        predicted: predictedPlayer
          ? `#${predictedPlayer.jerseyNumber} ${tDynamic(predictedPlayer.name)}${predictedAmount !== null ? ` (${predictedAmount})` : ""}`
          : t("prediction.summary.notSelected"),
        actual: actualPlayer
          ? `#${actualPlayer.jerseyNumber} ${tDynamic(actualPlayer.name)}${actualAmount !== null ? ` (${actualAmount})` : ""}`
          : "-",
        points: topStatPoints(
          predictedPlayerId,
          predictedAmount,
          actualPlayerId,
          actualAmount,
          rules,
        ),
      });
    });

    const teamStatRows: {
      label: string;
      predicted: number | null;
      actual: number | null;
    }[] = [
      {
        label: t("prediction.breakdown.teamThrees"),
        predicted: this.prediction.predictedTeamThrees,
        actual: result.actualTeamThrees,
      },
      {
        label: t("prediction.breakdown.teamRebounds"),
        predicted: this.prediction.predictedTeamRebounds,
        actual: result.actualTeamRebounds,
      },
      {
        label: t("prediction.breakdown.teamAssists"),
        predicted: this.prediction.predictedTeamAssists,
        actual: result.actualTeamAssists,
      },
    ];
    teamStatRows.forEach(({ label, predicted, actual }) => {
      rows.push({
        label,
        predicted: predicted !== null ? String(predicted) : "-",
        actual: actual !== null ? String(actual) : "-",
        points:
          predicted !== null && actual !== null
            ? teamStatPoints(predicted, actual, rules)
            : 0,
      });
    });

    const bonusQuestion = this.currentGame
      ? BONUS_QUESTIONS.get(this.currentGame.id)
      : undefined;
    if (bonusQuestion && result.actualBonusAnswer !== null) {
      const predicted = this.prediction.predictedBonusAnswer;
      const actual = result.actualBonusAnswer;
      rows.push({
        label: tDynamic(bonusQuestion.question),
        predicted:
          predicted === null
            ? "-"
            : predicted
              ? t("common.yes")
              : t("common.no"),
        actual: actual ? t("common.yes") : t("common.no"),
        points:
          predicted !== null && predicted === actual ? bonusQuestion.points : 0,
      });
    }

    section.appendChild(resultTable(rows, this.myGameScore));
  }

  // ---------------------------------------------------------------- summary / receipt

  /** "Bet slip" receipt of the current prediction, shared by the summary step and view-only mode. */
  private buildSummaryContent(section: HTMLElement) {
    const home = this.currentGame ? TEAMS[this.currentGame.homeTeamId] : null;
    const away = this.currentGame ? TEAMS[this.currentGame.awayTeamId] : null;

    const receipt = el("div", "receipt");
    const team = (tm: Team | null) =>
      `<div class="receipt__team">${tm ? `<img src="${tm.logo}" alt="" width="48" height="48" />` : ""}<span dir="auto">${tm ? esc(teamName(tm)) : ""}</span></div>`;
    receipt.innerHTML = `
      <div class="receipt__head">
        ${team(home)}
        <div class="receipt__score num" aria-label="${t("prediction.step.score")}">
          <span>${this.prediction.predictedHomeScore ?? "?"}</span><span class="receipt__dash">–</span><span>${this.prediction.predictedAwayScore ?? "?"}</span>
        </div>
        ${team(away)}
      </div>
    `;

    const rows = el("dl", "receipt__rows");
    const addRow = (label: string, value: string, sub = "") => {
      const r = el("div", "receipt__row");
      r.innerHTML = `<dt dir="auto"></dt><dd><span class="receipt__value" dir="auto"></span>${sub ? `<span class="receipt__sub num"></span>` : ""}</dd>`;
      r.querySelector("dt")!.textContent = label;
      r.querySelector(".receipt__value")!.textContent = value;
      if (sub) r.querySelector(".receipt__sub")!.textContent = sub;
      rows.appendChild(r);
    };

    CATEGORY_ORDER.forEach((category) => {
      const config = CATEGORY_CONFIG[category];
      const playerId = this.prediction[config.playerKey];
      const player = playerId ? this.playerById(playerId) : null;
      const amount = this.prediction[config.amountKey];
      addRow(
        t(config.labelKey),
        player ? `#${player.jerseyNumber} ${tDynamic(player.name)}` : t("prediction.summary.notSelected"),
        amount !== null ? `${amount} ${t(config.amountLabelKey)}` : "",
      );
    });

    const teamStatLines: { labelKey: string; value: number | null }[] = [
      { labelKey: "prediction.breakdown.teamThrees", value: this.prediction.predictedTeamThrees },
      { labelKey: "prediction.breakdown.teamRebounds", value: this.prediction.predictedTeamRebounds },
      { labelKey: "prediction.breakdown.teamAssists", value: this.prediction.predictedTeamAssists },
    ];
    teamStatLines.forEach(({ labelKey, value }) => {
      if (value === null) return;
      addRow(t(labelKey), String(value));
    });

    const bonusQuestion = this.currentGame
      ? BONUS_QUESTIONS.get(this.currentGame.id)
      : undefined;
    if (bonusQuestion && this.prediction.predictedBonusAnswer !== null) {
      addRow(
        tDynamic(bonusQuestion.question),
        this.prediction.predictedBonusAnswer ? t("common.yes") : t("common.no"),
      );
    }

    receipt.appendChild(rows);
    section.appendChild(receipt);
  }

  /** Builds the "everyone's average" panel shown after submitting and in view-only mode. */
  private buildAggregateContent(section: HTMLElement) {
    if (!this.aggregate || this.aggregate.totalPredictions === 0) return;
    const agg = this.aggregate;

    const card = el("section", "card card--lg aggregate");
    card.innerHTML = `
      <div class="aggregate__head">
        <h3 class="t-h3">${t("prediction.aggregate.title")}</h3>
        <span class="tag">${icon("users")}<span class="num">${t("prediction.aggregate.count", { n: agg.totalPredictions })}</span></span>
      </div>`;

    if (agg.avgHomeScore !== null && agg.avgAwayScore !== null) {
      const home = this.currentGame ? TEAMS[this.currentGame.homeTeamId] : null;
      const away = this.currentGame ? TEAMS[this.currentGame.awayTeamId] : null;
      card.appendChild(
        el(
          "div",
          "aggregate__score",
          `<span class="aggregate__label">${t("prediction.aggregate.avgScoreLabel")}</span>
           <div class="aggregate__score-row">
             ${home ? `<img src="${home.logo}" alt="${esc(teamName(home))}" width="32" height="32" />` : ""}
             <span class="t-h1 num">${agg.avgHomeScore}</span><span class="c-3">–</span><span class="t-h1 num">${agg.avgAwayScore}</span>
             ${away ? `<img src="${away.logo}" alt="${esc(teamName(away))}" width="32" height="32" />` : ""}
           </div>`,
        ),
      );
    }

    const rows = el("dl", "aggregate__rows");
    const addRow = (label: string, value: string) => {
      const r = el("div", "aggregate__row");
      r.innerHTML = `<dt></dt><dd dir="auto"></dd>`;
      r.querySelector("dt")!.textContent = label;
      r.querySelector("dd")!.textContent = value;
      rows.appendChild(r);
    };

    const leaderLines: {
      playerId: string | null;
      avg: number | null;
      labelKey: string;
    }[] = [
      {
        playerId: agg.topScorerPlayerId,
        avg: agg.avgTopScorerPoints,
        labelKey: "prediction.category.scorer",
      },
      {
        playerId: agg.topRebounderPlayerId,
        avg: agg.avgTopRebounds,
        labelKey: "prediction.category.rebounder",
      },
      {
        playerId: agg.topAssistPlayerId,
        avg: agg.avgTopAssists,
        labelKey: "prediction.category.assist",
      },
    ];
    leaderLines.forEach(({ playerId, avg, labelKey }) => {
      if (!playerId) return;
      const player = this.playerById(playerId);
      addRow(
        t(labelKey),
        `${player ? tDynamic(player.name) : t("prediction.aggregate.unknownPlayer")}${avg !== null ? ` · ${avg}` : ""}`,
      );
    });
    if (agg.avgTeamThrees !== null) addRow(t("prediction.breakdown.teamThrees"), String(agg.avgTeamThrees));
    if (agg.avgTeamRebounds !== null) addRow(t("prediction.breakdown.teamRebounds"), String(agg.avgTeamRebounds));
    if (agg.avgTeamAssists !== null) addRow(t("prediction.breakdown.teamAssists"), String(agg.avgTeamAssists));

    if (rows.childElementCount > 0) {
      card.appendChild(el("p", "overline aggregate__sub", t("prediction.aggregate.popularTitle")));
      card.appendChild(rows);
    }
    section.appendChild(card);
  }

  // ---------------------------------------------------------------- step 4: review & submit

  private renderSummaryStep(): [HTMLElement, HTMLElement] {
    const section = el("section", "prediction-section");
    section.appendChild(this.question(t("prediction.summary.title")));

    this.buildSummaryContent(section);

    const nav = this.buildNavButtons({
      backLabel: t("prediction.summary.backToEdit"),
      onBack: () => this.goBack(),
      nextLabel: t("prediction.summary.submit"),
      nextEnabled: true,
      onNext: () => this.submit(),
    });

    return [section, nav];
  }

  // ---------------------------------------------------------------- read-only view

  private renderViewOnlyStep(): HTMLElement {
    const section = el("section", "prediction-section");

    const heading = el(
      "p",
      `view-note${this.hasOwnPrediction ? " view-note--own" : ""}`,
      `${icon(this.hasOwnPrediction ? "check" : "info", { size: "sm" })}<span></span>`,
    );
    heading.lastElementChild!.textContent = this.hasOwnPrediction
      ? t("prediction.viewOnly.hasPrediction")
      : t("prediction.viewOnly.noPrediction");
    section.appendChild(heading);

    if (this.hasOwnPrediction && this.actualResult && this.scoringRules) {
      this.buildResultBreakdownTable(section);
    } else if (this.hasOwnPrediction) {
      this.buildSummaryContent(section);
    }
    this.buildAggregateContent(section);

    return section;
  }

  private renderViewOnlyActions(): HTMLElement {
    const bar = el("div", "action-bar");
    const inner = el("div", "action-bar__inner");

    if (
      this.hasOwnPrediction &&
      this.currentGame &&
      !isScoreLocked(this.currentGame)
    ) {
      const editBtn = el("button", "btn btn--secondary");
      editBtn.type = "button";
      editBtn.textContent = t("prediction.viewOnly.edit");
      editBtn.addEventListener("click", () => {
        this.viewMode = false;
        this.stepIndex = 0;
        this.statSubStep = 0;
        this.render();
        window.scrollTo({ top: 0 });
      });
      inner.appendChild(editBtn);
    }

    const backBtn = el("button", "btn btn--primary");
    backBtn.type = "button";
    backBtn.textContent = t("prediction.viewOnly.backToSchedule");
    backBtn.addEventListener("click", () => this.onBack());
    inner.appendChild(backBtn);
    bar.appendChild(inner);
    return bar;
  }

  // ---------------------------------------------------------------- submit

  private async submit() {
    if (!this.currentGame) return;

    const section = this.container.querySelector<HTMLElement>(".prediction-section");
    const actionBar = this.container.querySelector<HTMLElement>(".action-bar");
    const progress = this.container.querySelector<HTMLElement>(".progress");
    const submitBtn = actionBar?.querySelector<HTMLButtonElement>(".btn--primary");
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (!auth.currentUser) {
        if (section) {
          section.innerHTML = "";
          section.appendChild(this.sendingState(t("prediction.connectingGoogle")));
        }
        await signInWithGoogle();
      }

      const [d, m, y] = this.currentGame.date.split("/");
      const gameDate = `${y}-${m}-${d}`;

      await submitPrediction({
        gameId: this.currentGame.id,
        gameDate,
        predictedForeignPlayerIds: this.prediction.predictedForeignPlayerIds,
        topScorerPlayerId: this.prediction.topScorerPlayerId,
        topScorerPoints: this.prediction.topScorerPoints,
        topRebounderPlayerId: this.prediction.topRebounderPlayerId,
        topRebounds: this.prediction.topRebounds,
        topAssistPlayerId: this.prediction.topAssistPlayerId,
        topAssists: this.prediction.topAssists,
        predictedHomeScore: this.prediction.predictedHomeScore,
        predictedAwayScore: this.prediction.predictedAwayScore,
        predictedTeamThrees: this.prediction.predictedTeamThrees,
        predictedTeamRebounds: this.prediction.predictedTeamRebounds,
        predictedTeamAssists: this.prediction.predictedTeamAssists,
        predictedBonusAnswer: this.prediction.predictedBonusAnswer,
      });

      this.onSubmitted?.();

      try {
        this.aggregate = await getPredictionsAggregate(this.currentGame.id);
      } catch (err) {
        console.warn("Could not load predictions aggregate:", err);
      }

      if (section) {
        section.innerHTML = "";
        progress?.remove();
        const confirmation = el(
          "div",
          "submit-confirmation sent",
          `<div class="sent__ball">${logoMarkSVG()}</div>
           <h2 class="t-h1">${t("prediction.submitted.title")}</h2>
           <p class="c-2">${t("prediction.submitted.message")}</p>`,
        );
        section.appendChild(confirmation);
        this.buildAggregateContent(section);
        window.scrollTo({ top: 0 });
      }
      if (actionBar) {
        actionBar.replaceWith(this.singleAction(t("prediction.viewOnly.backToSchedule"), () => this.onBack()));
      }
    } catch (err) {
      console.error("Failed to submit prediction:", err);
      if (section) {
        section.innerHTML = "";
        const box = el(
          "div",
          "submit-confirmation submit-error",
          `<div class="banner banner--danger" role="alert">${icon("alert")}
             <div><p class="t-h3">${t("prediction.error.title")}</p><p>${t("prediction.error.message")}</p></div>
           </div>
           <p class="submit-error__detail" dir="auto"></p>`,
        );
        box.querySelector(".submit-error__detail")!.textContent =
          err instanceof Error ? err.message : String(err);
        section.appendChild(box);
      }
      if (actionBar) {
        actionBar.replaceWith(this.singleAction(t("prediction.viewOnly.backToSchedule"), () => this.onBack()));
      }
    }
  }

  private sendingState(text: string): HTMLElement {
    const box = el("div", "submit-confirmation sent", `<div class="sent__ball is-spinning">${logoMarkSVG()}</div><p class="c-2"></p>`);
    box.querySelector("p")!.textContent = text;
    return box;
  }

  private singleAction(label: string, onClick: () => void): HTMLElement {
    const bar = el("div", "action-bar");
    const inner = el("div", "action-bar__inner");
    const btn = el("button", "btn btn--primary");
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    inner.appendChild(btn);
    bar.appendChild(inner);
    return bar;
  }

  /** Sticky bottom action bar: "back" as a quiet text button, "next" as the one red CTA. */
  private buildNavButtons(opts: {
    backLabel?: string;
    onBack?: () => void;
    nextLabel: string;
    nextEnabled: boolean;
    onNext: () => void;
  }): HTMLElement {
    const bar = el("div", "action-bar");
    const nav = el("div", "action-bar__inner prediction-nav");

    if (opts.backLabel && opts.onBack) {
      const backBtn = el("button", "btn btn--ghost action-bar__back");
      backBtn.type = "button";
      backBtn.textContent = opts.backLabel;
      backBtn.addEventListener("click", opts.onBack);
      nav.appendChild(backBtn);
    }

    const nextBtn = el("button", "btn btn--primary", `<span></span>${icon("arrowForward", { size: "sm" })}`);
    nextBtn.type = "button";
    nextBtn.querySelector("span")!.textContent = opts.nextLabel;
    nextBtn.disabled = !opts.nextEnabled;
    nextBtn.addEventListener("click", opts.onNext);
    nav.appendChild(nextBtn);

    bar.appendChild(nav);
    return bar;
  }
}

/**
 * "Predicted vs. actual" table, shared with the leaderboard's per-user modal.
 * Aligned columns, tabular numbers, earned points in green.
 */
export function resultTable(
  rows: { label: string; predicted: string; actual: string; points: number }[],
  total: number | null,
): HTMLElement {
  const wrap = el("div", "result-table");
  wrap.setAttribute("role", "table");
  const header = el("div", "result-table__row result-table__head");
  header.setAttribute("role", "row");
  header.innerHTML = `
    <span role="columnheader">${t("prediction.breakdown.header.category")}</span>
    <span role="columnheader">${t("prediction.breakdown.header.predicted")}</span>
    <span role="columnheader">${t("prediction.breakdown.header.actual")}</span>
    <span role="columnheader" class="result-table__pts">${t("prediction.breakdown.header.points")}</span>
  `;
  wrap.appendChild(header);

  rows.forEach((row) => {
    const r = el("div", "result-table__row");
    r.setAttribute("role", "row");
    r.innerHTML = `
      <span role="cell" class="result-table__label" dir="auto"></span>
      <span role="cell" class="num" dir="auto"></span>
      <span role="cell" class="num" dir="auto"></span>
      <span role="cell" class="result-table__pts num${row.points > 0 ? " is-earned" : ""}">${row.points > 0 ? `+${row.points}` : "0"}</span>
    `;
    const cells = r.querySelectorAll("span");
    cells[0].textContent = row.label;
    cells[1].textContent = row.predicted;
    cells[2].textContent = row.actual;
    wrap.appendChild(r);
  });

  if (total !== null) {
    const r = el("div", "result-table__row result-table__total");
    r.setAttribute("role", "row");
    r.innerHTML = `<span role="cell">${t("prediction.breakdown.totalLabel")}</span><span role="cell"></span><span role="cell"></span><span role="cell" class="result-table__pts num">${total}</span>`;
    wrap.appendChild(r);
  }
  return wrap;
}
