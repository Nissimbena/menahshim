import type { Player, GamePrediction } from "./types";
import { boxScoreForGame } from "../config/boxscores";
import { teamStatsSection } from "./gameStats";
import { clipsForGame } from "../config/videos";
import { videoClips } from "../ui/VideoClips";
import { EMPTY_PREDICTION } from "./types";
import type { ScheduleGame, BonusQuestion } from "../schedule/schedule";
import { getBonusQuestion } from "../schedule/schedule";
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
import {
  CATEGORY_ORDER,
  CATEGORY_CONFIG,
  topStatPoints,
  finalScorePoints,
  teamStatPoints,
  type StatCategory,
} from "./scoring";
export {
  CATEGORY_ORDER,
  CATEGORY_CONFIG,
  topStatPoints,
  finalScorePoints,
  teamStatPoints,
  type StatCategory,
};
import { screenHeader, skeleton } from "../ui/ScreenHeader";
import { numberStepper } from "../ui/Stepper";
import { icon, type IconName } from "../ui/icons";
import {
  predictionSlip,
  predictionCompare,
  aggregateCard,
  playerMedia,
  playerNameHTML,
  CATEGORY_ICON,
  TEAM_STAT_ICON,
  resultHeader,
  crowdCompare,
} from "./recap";
import { el, esc } from "../ui/dom";
import { logoMarkSVG } from "../brand/Logo";

type StepKey = "score" | "stats" | "team" | "summary";
type CarouselKey = StatCategory;

const STEP_LABEL_KEYS: Record<StepKey, string> = {
  score: "prediction.step.score",
  stats: "prediction.step.stats",
  team: "prediction.step.team",
  summary: "prediction.step.summary",
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

/** Team-score stepper starts here on the first +/− tap - a realistic basketball score. */
const SCORE_STEPPER_START = 80;
/** Where an empty amount starts - a typical game line, not 0. Team totals also get quick-pick chips. */
const STAT_START: Record<StatCategory, number> = { scorer: 18, rebounder: 8, assist: 6 };
const TEAM_START = { predictedTeamThrees: 10, predictedTeamRebounds: 36, predictedTeamAssists: 20 } as const;
const TEAM_PRESETS = {
  predictedTeamThrees: [6, 8, 10, 12, 14],
  predictedTeamRebounds: [30, 33, 36, 39, 42],
  predictedTeamAssists: [15, 18, 20, 23, 26],
} as const;

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
    nav.setAttribute("aria-label", t("prediction.progress", { n: current, total }));
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

  /** Step badge: a red disc with the stat's icon, sat on the question. */
  private questionHead(iconName: IconName, overline: string, question: string): HTMLElement {
    const head = el(
      "div",
      "q-head",
      `<span class="q-head__badge">${icon(iconName, { size: "lg" })}</span>
       <span class="q-head__overline"></span>`,
    );
    head.querySelector(".q-head__overline")!.textContent = overline;
    const wrap = el("div", "q-wrap");
    wrap.appendChild(head);
    wrap.appendChild(this.question(question));
    return wrap;
  }

  private renderScoreStep(): [HTMLElement, HTMLElement] {
    const section = el("section", "prediction-section");
    section.appendChild(
      this.questionHead("statScore", t("prediction.step.score"), t("prediction.scoreStep.question")),
    );

    const home = this.currentGame ? TEAMS[this.currentGame.homeTeamId] : null;
    const away = this.currentGame ? TEAMS[this.currentGame.awayTeamId] : null;

    let homeValid = true;
    let awayValid = true;
    let nextBtn: HTMLButtonElement | null = null;
    let hint: HTMLElement | null = null;
    // Both scores are required to continue (not just "not invalid").
    const updateNextState = () => {
      const complete =
        this.prediction.predictedHomeScore !== null && this.prediction.predictedAwayScore !== null;
      const ok = homeValid && awayValid && complete;
      if (nextBtn) nextBtn.disabled = !ok;
      if (hint) hint.hidden = ok || !(homeValid && awayValid);
    };

    const buildTeamColumn = (
      team: Team | null,
      value: number | null,
      onInput: (value: number | null) => void,
      onValidityChange: (valid: boolean) => void,
    ) => {
      const col = el("div", "score-col");
      col.innerHTML = `
        <div class="score-col__team">
          ${team ? `<span class="logo-disc logo-disc--lg"><img src="${team.logo}" alt="" /></span>` : ""}
          <span class="score-col__name" dir="auto">${team ? esc(teamName(team)) : ""}</span>
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
      root.classList.add("stepper--vertical");
      const control = el("div", "score-col__control");
      control.append(root, error);
      col.appendChild(control);
      return col;
    };

    const card = el("div", "card score-card");
    card.appendChild(
      buildTeamColumn(
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
    card.appendChild(el("span", "score-card__vs", t("home.game.vs")));
    card.appendChild(
      buildTeamColumn(
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
      hint: t("prediction.required.score"),
    });
    nextBtn = nav.querySelector(".btn--primary") as HTMLButtonElement | null;
    hint = nav.querySelector(".action-bar__hint");
    updateNextState();

    return [section, nav];
  }

  // ---------------------------------------------------------------- step 2: team leaders

  private renderStatsStep(): [HTMLElement, HTMLElement] {
    const category = CATEGORY_ORDER[this.statSubStep];
    const config = CATEGORY_CONFIG[category];

    const section = el("section", "prediction-section");

    const head = this.questionHead(
      CATEGORY_ICON[category],
      `${t(config.labelKey)} · ${this.statSubStep + 1}/${CATEGORY_ORDER.length}`,
      t("prediction.statsStep.question", { label: t(config.labelKey) }),
    );
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
    head.querySelector(".q-head")!.appendChild(dots);
    section.appendChild(head);

    let nextBtn: HTMLButtonElement | null = null;
    let hint: HTMLElement | null = null;
    let amountValid = true;
    // The amount is required: "next" stays off until a valid number is set.
    const updateNextState = () => {
      const ok = amountValid && this.prediction[config.amountKey] !== null;
      if (nextBtn) nextBtn.disabled = !ok;
      if (hint) hint.hidden = ok || !amountValid;
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
      amount.innerHTML = `
        <div class="amount-card__who">
          ${playerMedia(player, "md")}
          <div class="amount-card__text">
            <span class="amount-card__q">${esc(t("prediction.amountFor", { label: t(config.amountLabelKey) }))}</span>
            ${playerNameHTML(player)}
          </div>
        </div>`;
      const { root, error, presets } = numberStepper({
        value: this.prediction[config.amountKey],
        max: MAX_PLAYER_STAT[category],
        emptyStart: STAT_START[category],
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
      if (presets) control.appendChild(presets);
      amount.appendChild(control);
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
      hint: t("prediction.required.amount", { label: t(config.amountLabelKey) }),
    });
    nextBtn = nav.querySelector(".btn--primary") as HTMLButtonElement | null;
    hint = nav.querySelector(".action-bar__hint");
    updateNextState();

    return [section, nav];
  }

  /** Roster cards (photo on a Hapoel-red field, name, shirt number) - pick one. */
  private renderPlayerGrid(category: CarouselKey): HTMLElement {
    const grid = el("div", "roster-grid");
    grid.setAttribute("role", "radiogroup");
    grid.setAttribute("aria-label", t(CATEGORY_CONFIG[category].labelKey));
    const selected = this.carouselIndex[category] % this.players.length;

    this.players.forEach((player, index) => {
      const isSelected = index === selected;
      const inSquad = this.squadPlayerIds?.has(player.id) ?? null;
      const card = el(
        "button",
        "pcard" + (isSelected ? " is-selected" : "") + (inSquad === false ? " is-out" : ""),
      );
      card.type = "button";
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", String(isSelected));
      card.setAttribute("aria-label", `${player.jerseyNumber} ${tDynamic(player.name)}`);
      card.innerHTML = `
        <span class="pcard__media">
          <span class="pcard__num num--display" aria-hidden="true">${player.jerseyNumber}</span>
          ${playerMedia(player, "lg")}
          <span class="pcard__check">${icon("check", { size: "sm" })}</span>
        </span>
        <span class="pcard__body">
          ${playerNameHTML(player)}
          <span class="pcard__meta">
            <span class="pcard__pos">${esc(tDynamic(player.position))}</span>
            ${inSquad ? `<span class="pcard__squad">${t("prediction.inSquad")}</span>` : ""}
          </span>
        </span>
      `;
      card.addEventListener("click", () => {
        if (this.carouselIndex[category] === index) return;
        this.carouselIndex[category] = index;
        this.prediction[CATEGORY_CONFIG[category].playerKey] = player.id;
        const y = window.scrollY;
        this.render();
        window.scrollTo({ top: y });
        (this.container.querySelectorAll<HTMLElement>(".pcard")[index])?.focus({ preventScroll: true });
        // On phones the amount sits below the roster - bring it into view.
        const amountCard = this.container.querySelector<HTMLElement>(".amount-card");
        if (amountCard) {
          const r = amountCard.getBoundingClientRect();
          const bar = this.container.querySelector<HTMLElement>(".action-bar")?.offsetHeight ?? 0;
          if (r.bottom > window.innerHeight - bar) {
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollBy({ top: r.bottom - (window.innerHeight - bar) + 16, behavior: reduce ? "auto" : "smooth" });
          }
        }
      });
      grid.appendChild(card);
    });
    return grid;
  }

  // ---------------------------------------------------------------- step 3: team totals

  private renderTeamStep(): [HTMLElement, HTMLElement] {
    const section = el("section", "prediction-section");
    section.appendChild(
      this.questionHead("statThrees", t("prediction.step.team"), t("prediction.teamStep.question")),
    );

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
    let hint: HTMLElement | null = null;
    // All three team totals are required.
    const updateNextState = () => {
      const allValid = Object.values(validity).every(Boolean);
      const complete = fields.every(({ key }) => this.prediction[key] !== null);
      if (nextBtn) nextBtn.disabled = !(allValid && complete);
      if (hint) hint.hidden = complete || !allValid;
    };

    const card = el("div", "card team-card");
    fields.forEach(({ labelKey, key, max }) => {
      const row = el(
        "div",
        "team-row",
        `<span class="team-row__label"><span class="team-row__icon">${icon(TEAM_STAT_ICON[key])}</span><span></span></span>`,
      );
      row.querySelector(".team-row__label > span:last-child")!.textContent = t(labelKey);
      const { root, error, presets } = numberStepper({
        value: this.prediction[key],
        max,
        emptyStart: TEAM_START[key],
        presets: [...TEAM_PRESETS[key]],
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
      if (presets) control.appendChild(presets);
      row.appendChild(control);
      card.appendChild(row);
    });
    section.appendChild(card);

    const bonusQuestion = this.currentGame
      ? getBonusQuestion(this.currentGame.id)
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
      hint: t("prediction.required.team"),
    });
    nextBtn = nav.querySelector(".btn--primary") as HTMLButtonElement | null;
    hint = nav.querySelector(".action-bar__hint");
    updateNextState();

    return [section, nav];
  }

  /** The one-off yes/no bonus question field, only shown for specific games (set by an admin). */
  private buildBonusQuestionField(bonusQuestion: BonusQuestion): HTMLElement {
    const field = el("div", "card bonus-card");
    field.innerHTML = `
      <span class="tag tag--red">${icon("statBonus")}${t("admin.bonusQuestionLabel", { points: bonusQuestion.points })}</span>
      <p class="bonus-card__text" dir="auto">${esc(tDynamic(bonusQuestion.question))}</p>
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

  // ---------------------------------------------------------------- recap views

  /** Post-game recap: predicted vs. actual, a player photo beside every leader stat. */
  private buildResultBreakdownTable(section: HTMLElement) {
    section.appendChild(
      predictionCompare({
        prediction: this.prediction,
        result: this.actualResult,
        rules: this.scoringRules!,
        gameId: this.currentGame?.id ?? "",
        game: this.currentGame,
        playerById: (id) => this.playerById(id),
        total: this.myGameScore,
        predictedLabel: t("prediction.breakdown.yourSide"),
      }),
    );
  }

  /** The prediction as a bet slip - shared by the summary step and view-only mode. */
  private buildSummaryContent(section: HTMLElement) {
    section.appendChild(predictionSlip(this.prediction, this.currentGame, (id) => this.playerById(id)));
  }

  /** "How everyone predicted", shown after submitting and in view-only mode. */
  private buildAggregateContent(section: HTMLElement) {
    if (!this.aggregate || this.aggregate.totalPredictions === 0) return;
    section.appendChild(aggregateCard(this.aggregate, this.currentGame, (id) => this.playerById(id)));
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

    const game = this.currentGame;
    if (game?.result || this.actualResult) {
      // Finished game = a game page. One masthead, then sections in a fixed
      // order, each with the same h2 level and listed in a jump bar:
      //   my prediction -> team stats -> videos -> everyone
      heading.remove();
      section.classList.add("game-page");
      section.appendChild(resultHeader(game!, this.actualResult));

      const parts: { id: string; label: string; build: () => HTMLElement | null }[] = [
        {
          id: "gp-mine",
          label: t("gamePage.mine"),
          build: () => {
            const box = el("div", "game-page__body");
            if (this.hasOwnPrediction && this.actualResult && this.scoringRules) this.buildResultBreakdownTable(box);
            else if (this.hasOwnPrediction) this.buildSummaryContent(box);
            else box.appendChild(el("p", "game-page__none", esc(t("prediction.viewOnly.noPrediction"))));
            return box;
          },
        },
        {
          id: "gp-stats",
          label: t("gamePage.stats"),
          build: () =>
            this.actualResult
              ? teamStatsSection({
                  result: this.actualResult,
                  teamScore:
                    game!.homeTeamId === "jerusalem"
                      ? (this.actualResult.actualHomeScore ?? game!.result?.home ?? null)
                      : (this.actualResult.actualAwayScore ?? game!.result?.away ?? null),
                  box: boxScoreForGame(game!.id),
                  playerById: (id) => this.playerById(id),
                })
              : null,
        },
        {
          id: "gp-videos",
          label: t("videos.title"),
          build: () => videoClips(clipsForGame(game!.id)),
        },
        {
          id: "gp-crowd",
          label: t("gamePage.crowd"),
          build: () => {
            const box = el("div", "game-page__body");
            if (this.actualResult && this.aggregate && this.aggregate.totalPredictions > 0) {
              box.appendChild(crowdCompare(this.aggregate, this.actualResult, game, (id) => this.playerById(id)));
            } else this.buildAggregateContent(box);
            return box.childElementCount ? box : null;
          },
        },
      ];

      const built = parts.map((p) => ({ ...p, node: p.build() })).filter((p) => p.node);
      const jump = el("nav", "game-page__jump");
      jump.setAttribute("aria-label", t("gamePage.sections"));
      built.forEach((p) => {
        const a = el("a", "game-page__jump-link", esc(p.label));
        a.href = `#${p.id}`;
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const target = document.getElementById(p.id);
          target?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          target?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
        });
        jump.appendChild(a);
      });
      section.appendChild(jump);

      built.forEach((p) => {
        const sec = el("section", "game-page__section");
        sec.id = p.id;
        sec.setAttribute("aria-labelledby", `${p.id}-h`);
        sec.innerHTML = `<h2 class="game-page__h" id="${p.id}-h" tabindex="-1">${esc(p.label)}</h2>`;
        sec.appendChild(p.node!);
        section.appendChild(sec);
      });
      return section;
    }

    if (this.hasOwnPrediction) this.buildSummaryContent(section);
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
    /** Shown above the buttons while "next" is off because something required is missing. */
    hint?: string;
  }): HTMLElement {
    const bar = el("div", "action-bar");
    if (opts.hint) {
      const hint = el("p", "action-bar__hint", `${icon("info", { size: "sm" })}<span></span>`);
      hint.querySelector("span")!.textContent = opts.hint;
      hint.hidden = true;
      hint.setAttribute("aria-live", "polite");
      bar.appendChild(hint);
    }
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
