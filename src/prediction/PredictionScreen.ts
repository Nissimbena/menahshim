import type { Player, GamePrediction } from "./types";
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

// Placeholder silhouette shown for players without a photoUrl.
const AVATAR_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="50" cy="36" r="19" />
  <path d="M50 60c-24 0-43 14-43 31v7h86v-7c0-17-19-31-43-31z" />
</svg>`;

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

/**
 * Prediction flow:
 * 1) The final score (with both team logos).
 * 2) "Personal questions" - who will lead the team in points/rebounds/assists,
 *    and by how much - one category at a time via a swipeable carousel.
 * 3) Team-level totals: made threes, rebounds, assists.
 * 4) Review & submit (saved via the backend API under the signed-in user).
 */
export class PredictionScreen {
  private container: HTMLElement;
  private players: Player[];
  private onBack: () => void;
  private onSubmitted?: () => void;

  private steps: StepKey[] = ["score", "stats", "team", "summary"];
  private stepIndex = 0;
  private statSubStep = 0;
  private carouselIndex: Record<CarouselKey, number> = {
    scorer: 0,
    rebounder: 0,
    assist: 0,
  };
  private carouselDirection: 1 | -1 = 1;
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
  private squadPanelOpen = true;

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
    this.squadPanelOpen = true;
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

  private playerById(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  private render() {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "prediction-wrapper";

    wrapper.appendChild(this.renderHeader());

    if (this.loading) {
      const loading = document.createElement("div");
      loading.className = "prediction-section";
      loading.innerHTML = `<p class="counter-text">${t("prediction.loadingMyPrediction")}</p>`;
      wrapper.appendChild(loading);
      this.container.appendChild(wrapper);
      return;
    }

    if (this.viewMode) {
      const panel = this.renderViewOnlyStep();
      panel.classList.add("step-panel");
      wrapper.appendChild(panel);
      this.container.appendChild(wrapper);
      return;
    }

    wrapper.appendChild(this.renderStepIndicator());

    const key = this.steps[this.stepIndex];
    let panel: HTMLElement;
    if (key === "score") panel = this.renderScoreStep();
    else if (key === "stats") panel = this.renderStatsStep();
    else if (key === "team") panel = this.renderTeamStep();
    else panel = this.renderSummaryStep();

    panel.classList.add("step-panel");
    if (this.animatePanel) {
      panel.classList.add(
        this.lastDirection === 1 ? "slide-forward" : "slide-back",
      );
      this.animatePanel = false;
    }
    wrapper.appendChild(panel);

    this.container.appendChild(wrapper);
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

    const header = document.createElement("div");
    header.className = "prediction-header";
    header.innerHTML = `
      <button class="btn-back" type="button">&rarr; ${t("common.back")}</button>
      <div class="prediction-title">
        <h1>${t("prediction.header.title")}</h1>
        <p dir="auto">${subtitle}</p>
      </div>
      <div class="prediction-header-spacer"></div>
    `;
    header
      .querySelector(".btn-back")
      ?.addEventListener("click", () => this.onBack());
    return header;
  }

  private renderStepIndicator(): HTMLElement {
    const nav = document.createElement("div");
    nav.className = "step-indicator";
    this.steps.forEach((key, i) => {
      const el = document.createElement("div");
      el.className =
        "step-pill" +
        (i === this.stepIndex ? " active" : i < this.stepIndex ? " done" : "");
      el.textContent = `${i + 1}. ${t(STEP_LABEL_KEYS[key])}`;
      nav.appendChild(el);
    });
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
      return;
    }
    this.lastDirection = 1;
    this.animatePanel = true;
    this.stepIndex = Math.min(this.stepIndex + 1, this.steps.length - 1);
    if (this.steps[this.stepIndex] === "stats") this.statSubStep = 0;
    this.render();
  }

  private goBack() {
    if (this.steps[this.stepIndex] === "stats" && this.statSubStep > 0) {
      this.lastDirection = -1;
      this.animatePanel = true;
      this.statSubStep -= 1;
      this.render();
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
  }

  /** Label for the "next" button when leaving the current top-level step. */
  private nextStepLabel(): string {
    const nextKey = this.steps[this.stepIndex + 1];
    if (!nextKey || nextKey === "summary") return t("prediction.nav.toSummary");
    return t("prediction.nav.next", { label: t(STEP_LABEL_KEYS[nextKey]) });
  }

  /** Official registered squad for tonight's game (basket.co.il, published game day ~10am) - helps before picking a scorer/rebounder/assist. */
  private renderSquadPanel(): HTMLElement | null {
    if (!this.squadPlayerIds || this.squadPlayerIds.size === 0) return null;

    const squadPlayers = this.players
      .filter((p) => this.squadPlayerIds!.has(p.id))
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber);
    if (squadPlayers.length === 0) return null;

    const panel = document.createElement("div");
    panel.className = "squad-panel";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "squad-panel-header";
    header.innerHTML = `
      <h3>${t("prediction.squadPanelTitle")}</h3>
      <span class="squad-panel-arrow${this.squadPanelOpen ? " open" : ""}">&#9660;</span>
    `;
    header.addEventListener("click", () => {
      this.squadPanelOpen = !this.squadPanelOpen;
      this.render();
    });
    panel.appendChild(header);

    if (this.squadPanelOpen) {
      const list = document.createElement("div");
      list.className = "squad-panel-players";
      squadPlayers.forEach((player) => {
        const chip = document.createElement("div");
        chip.className = "squad-chip";
        chip.innerHTML = `
          <span class="squad-chip-avatar">${player.photoUrl ? `<img src="${player.photoUrl}" alt="" />` : AVATAR_SVG}</span>
          <span class="squad-chip-number">#${player.jerseyNumber}</span>
          <span class="squad-chip-name" dir="auto">${tDynamic(player.name)}</span>
        `;
        list.appendChild(chip);
      });
      panel.appendChild(list);
    }

    return panel;
  }

  // ---- Step: final score (with team logos) ----
  private renderScoreStep(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    const squadPanel = this.renderSquadPanel();
    if (squadPanel) section.appendChild(squadPanel);

    const counter = document.createElement("p");
    counter.className = "counter-text";
    counter.textContent = t("prediction.scoreStep.question");
    section.appendChild(counter);

    const home = this.currentGame ? TEAMS[this.currentGame.homeTeamId] : null;
    const away = this.currentGame ? TEAMS[this.currentGame.awayTeamId] : null;

    const teams = document.createElement("div");
    teams.className = "score-teams";

    const buildTeamColumn = (
      team: Team | null,
      value: number | null,
      onInput: (value: number | null) => void,
      onValidityChange: (valid: boolean) => void,
    ) => {
      const col = document.createElement("div");
      col.className = "score-team";
      col.innerHTML = `
        ${team ? `<img class="score-team-logo" src="${team.logo}" alt="${teamName(team)}" />` : ""}
        <span class="score-team-name" dir="auto">${team ? teamName(team) : ""}</span>
      `;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = String(MAX_TEAM_SCORE);
      input.className = "score-input";
      input.value = value === null ? "" : String(value);
      const errorEl = document.createElement("div");
      errorEl.className = "field-error-msg";
      input.addEventListener("input", () => {
        if (input.value === "") {
          input.classList.remove("field-invalid");
          errorEl.textContent = "";
          onInput(null);
          onValidityChange(true);
          return;
        }
        const parsed = Number(input.value);
        const valid =
          Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_TEAM_SCORE;
        input.classList.toggle("field-invalid", !valid);
        errorEl.textContent = valid
          ? ""
          : t("prediction.error.range", { min: 0, max: MAX_TEAM_SCORE });
        onInput(valid ? parsed : null);
        onValidityChange(valid);
      });
      col.appendChild(input);
      col.appendChild(errorEl);
      return col;
    };

    let homeValid = true;
    let awayValid = true;
    let nextBtn: HTMLButtonElement | null = null;
    const updateNextState = () => {
      if (nextBtn) nextBtn.disabled = !(homeValid && awayValid);
    };

    teams.appendChild(
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

    const vs = document.createElement("div");
    vs.className = "score-vs";
    vs.textContent = "-";
    teams.appendChild(vs);

    teams.appendChild(
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

    section.appendChild(teams);

    const nav = this.buildNavButtons({
      backLabel: t("common.backBtn"),
      onBack: () => this.goBack(),
      nextLabel: this.nextStepLabel(),
      nextEnabled: true,
      onNext: () => this.goNext(),
    });
    nextBtn = nav.querySelector(".btn-primary") as HTMLButtonElement | null;
    section.appendChild(nav);

    return section;
  }

  // ---- Step: top scorer / rebounder / assist man, one at a time via a swipeable carousel ----
  private renderStatsStep(): HTMLElement {
    const category = CATEGORY_ORDER[this.statSubStep];
    const config = CATEGORY_CONFIG[category];

    const section = document.createElement("div");
    section.className = "prediction-section";

    const counter = document.createElement("p");
    counter.className = "counter-text";
    counter.textContent = t("prediction.statsStep.question", {
      label: t(config.labelKey),
    });
    section.appendChild(counter);

    const subIndicator = document.createElement("div");
    subIndicator.className = "stat-sub-indicator";
    CATEGORY_ORDER.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.className =
        "stat-sub-dot" +
        (i === this.statSubStep
          ? " active"
          : i < this.statSubStep
            ? " done"
            : "");
      subIndicator.appendChild(dot);
    });
    section.appendChild(subIndicator);

    let nextBtn: HTMLButtonElement | null = null;
    let amountValid = true;
    const updateNextState = () => {
      if (nextBtn) nextBtn.disabled = !amountValid;
    };

    if (this.players.length === 0) {
      const loading = document.createElement("p");
      loading.className = "counter-text";
      loading.textContent = t("prediction.loadingPlayers");
      section.appendChild(loading);
    } else {
      const index = this.carouselIndex[category];
      const player = this.players[index];
      if (this.prediction[config.playerKey] !== player.id) {
        this.prediction[config.playerKey] = player.id;
      }

      section.appendChild(this.renderCarousel(category, this.players));

      const amountField = document.createElement("label");
      amountField.className = "stat-field amount-field";
      amountField.innerHTML = `<span>${t(config.amountLabelKey)}</span>`;
      const maxAmount = MAX_PLAYER_STAT[category];
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = String(maxAmount);
      input.value =
        this.prediction[config.amountKey] === null
          ? ""
          : String(this.prediction[config.amountKey]);
      const errorEl = document.createElement("div");
      errorEl.className = "field-error-msg";
      input.addEventListener("input", () => {
        if (input.value === "") {
          input.classList.remove("field-invalid");
          errorEl.textContent = "";
          this.prediction[config.amountKey] = null;
          amountValid = true;
          updateNextState();
          return;
        }
        const parsed = Number(input.value);
        const valid =
          Number.isFinite(parsed) && parsed >= 0 && parsed <= maxAmount;
        input.classList.toggle("field-invalid", !valid);
        errorEl.textContent = valid
          ? ""
          : t("prediction.error.range", { min: 0, max: maxAmount });
        this.prediction[config.amountKey] = valid ? parsed : null;
        amountValid = valid;
        updateNextState();
      });
      amountField.appendChild(input);
      amountField.appendChild(errorEl);
      section.appendChild(amountField);
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
    nextBtn = nav.querySelector(".btn-primary") as HTMLButtonElement | null;
    section.appendChild(nav);

    return section;
  }

  /** Renders a 3-card (prev/current/next) sliding carousel for picking a player. */
  private renderCarousel(category: CarouselKey, pool: Player[]): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "player-carousel";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "carousel-arrow";
    prevBtn.textContent = "→";
    prevBtn.setAttribute("aria-label", t("prediction.carousel.prev"));
    prevBtn.addEventListener("click", () =>
      this.moveCarousel(category, pool, -1),
    );
    wrap.appendChild(prevBtn);

    const viewport = document.createElement("div");
    viewport.className = "carousel-viewport";

    const len = pool.length;
    const cur = this.carouselIndex[category] % len;
    const prevPlayer = pool[(cur - 1 + len) % len];
    const curPlayer = pool[cur];
    const nextPlayer = pool[(cur + 1) % len];

    const track = document.createElement("div");
    track.className =
      "carousel-track " +
      (this.carouselDirection === 1
        ? "carousel-slide-next"
        : "carousel-slide-prev");
    track.appendChild(this.buildCarouselCard(prevPlayer, "side"));
    track.appendChild(this.buildCarouselCard(curPlayer, "current"));
    track.appendChild(this.buildCarouselCard(nextPlayer, "side"));
    viewport.appendChild(track);

    let startX = 0;
    viewport.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener("pointerup", (e) => {
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 40) this.moveCarousel(category, pool, dx < 0 ? 1 : -1);
    });
    wrap.appendChild(viewport);

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "carousel-arrow";
    nextBtn.textContent = "←";
    nextBtn.setAttribute("aria-label", t("prediction.carousel.next"));
    nextBtn.addEventListener("click", () =>
      this.moveCarousel(category, pool, 1),
    );
    wrap.appendChild(nextBtn);

    return wrap;
  }

  private buildCarouselCard(
    player: Player,
    kind: "current" | "side",
  ): HTMLElement {
    const card = document.createElement("div");
    card.className = `carousel-card ${kind}`;
    card.innerHTML = `
      <span class="player-avatar">${player.photoUrl ? `<img src="${player.photoUrl}" alt="" />` : AVATAR_SVG}</span>
      <span class="player-jersey">#${player.jerseyNumber}</span>
      <span class="player-name" dir="auto">${tDynamic(player.name)}</span>
      ${kind === "current" ? `<span class="player-position">${tDynamic(player.position)}</span>` : ""}
    `;
    return card;
  }

  private moveCarousel(category: CarouselKey, pool: Player[], delta: number) {
    if (pool.length === 0) return;
    const len = pool.length;
    const cur = this.carouselIndex[category] % len;
    this.carouselDirection = delta > 0 ? 1 : -1;
    this.carouselIndex[category] = (cur + delta + len) % len;
    this.render();
  }

  // ---- Step: team-level totals (threes made, rebounds, assists) ----
  private renderTeamStep(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    const counter = document.createElement("p");
    counter.className = "counter-text";
    counter.textContent = t("prediction.teamStep.question");
    section.appendChild(counter);

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

    fields.forEach(({ labelKey, key, max }) => {
      const field = document.createElement("label");
      field.className = "stat-field amount-field";
      field.innerHTML = `<span>${t(labelKey)}</span>`;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = String(max);
      input.value =
        this.prediction[key] === null ? "" : String(this.prediction[key]);
      const errorEl = document.createElement("div");
      errorEl.className = "field-error-msg";
      input.addEventListener("input", () => {
        if (input.value === "") {
          input.classList.remove("field-invalid");
          errorEl.textContent = "";
          this.prediction[key] = null;
          validity[key] = true;
          updateNextState();
          return;
        }
        const parsed = Number(input.value);
        const valid = Number.isFinite(parsed) && parsed >= 0 && parsed <= max;
        input.classList.toggle("field-invalid", !valid);
        errorEl.textContent = valid
          ? ""
          : t("prediction.error.range", { min: 0, max });
        this.prediction[key] = valid ? parsed : null;
        validity[key] = valid;
        updateNextState();
      });
      field.appendChild(input);
      field.appendChild(errorEl);
      section.appendChild(field);
    });

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
    });
    nextBtn = nav.querySelector(".btn-primary") as HTMLButtonElement | null;
    section.appendChild(nav);

    return section;
  }

  /** The one-off yes/no bonus question field, only shown for specific games (set by an admin). */
  private buildBonusQuestionField(bonusQuestion: BonusQuestion): HTMLElement {
    const field = document.createElement("div");
    field.className = "bonus-question-field";
    field.innerHTML = `
      <span class="bonus-question-badge">${t("admin.bonusQuestionLabel", { points: bonusQuestion.points })}</span>
      <p class="bonus-question-text" dir="auto">${tDynamic(bonusQuestion.question)}</p>
    `;

    const buttons = document.createElement("div");
    buttons.className = "bonus-question-buttons";

    const buildChoice = (label: string, value: boolean) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "btn-secondary bonus-question-choice" +
        (this.prediction.predictedBonusAnswer === value ? " selected" : "");
      btn.textContent = label;
      btn.addEventListener("click", () => {
        this.prediction.predictedBonusAnswer = value;
        this.render();
      });
      return btn;
    };

    buttons.appendChild(buildChoice(t("common.yes"), true));
    buttons.appendChild(buildChoice(t("common.no"), false));
    field.appendChild(buttons);

    return field;
  }

  /** Post-game recap: a table of predicted vs. actual, with the points each row earned. */
  private buildResultBreakdownTable(section: HTMLElement) {
    const result = this.actualResult!;
    const rules = this.scoringRules!;

    const heading = document.createElement("h3");
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
      ? getBonusQuestion(this.currentGame.id)
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

    const table = document.createElement("div");
    table.className = "result-table";

    const header = document.createElement("div");
    header.className = "result-table-row result-table-header";
    header.innerHTML = `
      <span>${t("prediction.breakdown.header.category")}</span>
      <span>${t("prediction.breakdown.header.predicted")}</span>
      <span>${t("prediction.breakdown.header.actual")}</span>
      <span>${t("prediction.breakdown.header.points")}</span>
    `;
    table.appendChild(header);

    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "result-table-row";
      rowEl.innerHTML = `
        <span>${row.label}</span>
        <span dir="auto">${row.predicted}</span>
        <span dir="auto">${row.actual}</span>
        <span class="result-table-points">${row.points}</span>
      `;
      table.appendChild(rowEl);
    });
    section.appendChild(table);

    if (this.myGameScore !== null) {
      const totalP = document.createElement("p");
      totalP.className = "counter-text";
      totalP.dir = "auto";
      totalP.textContent = t("prediction.breakdown.totalScore", {
        score: this.myGameScore,
      });
      section.appendChild(totalP);
    }
  }

  /** Builds the hero score + leaders grid + foreign chips, shared by the summary and view-only steps. */
  private buildSummaryContent(section: HTMLElement) {
    const home = this.currentGame ? TEAMS[this.currentGame.homeTeamId] : null;
    const away = this.currentGame ? TEAMS[this.currentGame.awayTeamId] : null;

    const hero = document.createElement("div");
    hero.className = "summary-score-hero";
    hero.innerHTML = `
      <div class="summary-score-team">
        ${home ? `<img src="${home.logo}" alt="${teamName(home)}" />` : ""}
        <span dir="auto">${home ? teamName(home) : ""}</span>
      </div>
      <div class="summary-score-numbers">
        ${this.prediction.predictedHomeScore ?? "?"} - ${this.prediction.predictedAwayScore ?? "?"}
      </div>
      <div class="summary-score-team">
        ${away ? `<img src="${away.logo}" alt="${teamName(away)}" />` : ""}
        <span dir="auto">${away ? teamName(away) : ""}</span>
      </div>
    `;
    section.appendChild(hero);

    const leadersGrid = document.createElement("div");
    leadersGrid.className = "summary-leaders-grid";
    CATEGORY_ORDER.forEach((category) => {
      const config = CATEGORY_CONFIG[category];
      const playerId = this.prediction[config.playerKey];
      const player = playerId ? this.playerById(playerId) : null;
      const amount = this.prediction[config.amountKey];

      const card = document.createElement("div");
      card.className = "summary-leader-card";
      card.innerHTML = `
        <span class="player-avatar small">${player?.photoUrl ? `<img src="${player.photoUrl}" alt="" />` : AVATAR_SVG}</span>
        <h4>${t(config.labelKey)}</h4>
        <p dir="auto">${player ? `#${player.jerseyNumber} ${tDynamic(player.name)}` : t("prediction.summary.notSelected")}</p>
        <p class="summary-leader-amount">${amount !== null ? `${amount} ${t(config.amountLabelKey)}` : ""}</p>
      `;
      leadersGrid.appendChild(card);
    });
    section.appendChild(leadersGrid);

    const teamStatLines: { textKey: string; value: number | null }[] = [
      {
        textKey: "prediction.summary.threes",
        value: this.prediction.predictedTeamThrees,
      },
      {
        textKey: "prediction.summary.rebounds",
        value: this.prediction.predictedTeamRebounds,
      },
      {
        textKey: "prediction.summary.assists",
        value: this.prediction.predictedTeamAssists,
      },
    ];
    teamStatLines.forEach(({ textKey, value }) => {
      if (value === null) return;
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = `${t(textKey)} ${value}`;
      section.appendChild(p);
    });

    const bonusQuestion = this.currentGame
      ? getBonusQuestion(this.currentGame.id)
      : undefined;
    if (bonusQuestion && this.prediction.predictedBonusAnswer !== null) {
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = `${tDynamic(bonusQuestion.question)} - ${this.prediction.predictedBonusAnswer ? t("common.yes") : t("common.no")}`;
      section.appendChild(p);
    }
  }

  /** Builds the "everyone's average" panel shown right after a successful submit. */
  private buildAggregateContent(section: HTMLElement) {
    if (!this.aggregate || this.aggregate.totalPredictions === 0) return;
    const agg = this.aggregate;

    const heading = document.createElement("h3");
    heading.textContent = t("prediction.aggregate.heading", {
      n: agg.totalPredictions,
    });
    section.appendChild(heading);

    if (agg.avgHomeScore !== null && agg.avgAwayScore !== null) {
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = t("prediction.aggregate.avgScore", {
        home: agg.avgHomeScore,
        away: agg.avgAwayScore,
      });
      section.appendChild(p);
    }

    if (agg.avgTeamThrees !== null) {
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = t("prediction.aggregate.avgThrees", {
        v: agg.avgTeamThrees,
      });
      section.appendChild(p);
    }
    if (agg.avgTeamRebounds !== null) {
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = t("prediction.aggregate.avgRebounds", {
        v: agg.avgTeamRebounds,
      });
      section.appendChild(p);
    }
    if (agg.avgTeamAssists !== null) {
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = t("prediction.aggregate.avgAssists", {
        v: agg.avgTeamAssists,
      });
      section.appendChild(p);
    }

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
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = t("prediction.aggregate.mostPicked", {
        player: player
          ? tDynamic(player.name)
          : t("prediction.aggregate.unknownPlayer"),
        label: t(labelKey),
        avgSuffix:
          avg !== null ? t("prediction.aggregate.avgSuffix", { avg }) : "",
      });
      section.appendChild(p);
    });
  }

  // ---- Step: review & submit ----
  private renderSummaryStep(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    this.buildSummaryContent(section);

    section.appendChild(
      this.buildNavButtons({
        backLabel: t("prediction.summary.backToEdit"),
        onBack: () => this.goBack(),
        nextLabel: t("prediction.summary.submit"),
        nextEnabled: true,
        onNext: () => this.submit(),
      }),
    );

    return section;
  }

  // ---- Read-only view of an already-submitted prediction ----
  private renderViewOnlyStep(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    const heading = document.createElement("p");
    heading.className = "counter-text";
    heading.textContent = this.hasOwnPrediction
      ? t("prediction.viewOnly.hasPrediction")
      : t("prediction.viewOnly.noPrediction");
    section.appendChild(heading);

    if (this.hasOwnPrediction && this.actualResult && this.scoringRules) {
      this.buildResultBreakdownTable(section);
    } else if (this.hasOwnPrediction) {
      this.buildSummaryContent(section);
    }
    this.buildAggregateContent(section);

    const nav = document.createElement("div");
    nav.className = "prediction-nav";

    if (
      this.hasOwnPrediction &&
      this.currentGame &&
      !isScoreLocked(this.currentGame)
    ) {
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn-secondary";
      editBtn.textContent = t("prediction.viewOnly.edit");
      editBtn.addEventListener("click", () => {
        this.viewMode = false;
        this.stepIndex = 0;
        this.statSubStep = 0;
        this.render();
      });
      nav.appendChild(editBtn);
    }

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "btn-primary";
    backBtn.textContent = t("prediction.viewOnly.backToSchedule");
    backBtn.addEventListener("click", () => this.onBack());
    nav.appendChild(backBtn);
    section.appendChild(nav);

    return section;
  }

  private async submit() {
    if (!this.currentGame) return;

    const section = this.container.querySelector(".prediction-section");

    try {
      if (!auth.currentUser) {
        if (section) {
          section.innerHTML = `<div class="submit-confirmation"><p>${t("prediction.connectingGoogle")}</p></div>`;
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
        const confirmation = document.createElement("div");
        confirmation.className = "submit-confirmation";
        confirmation.innerHTML = `
          <h2>${t("prediction.submitted.title")}</h2>
          <p>${t("prediction.submitted.message")}</p>
        `;
        this.buildAggregateContent(confirmation);
        section.appendChild(confirmation);
      }
    } catch (err) {
      console.error("Failed to submit prediction:", err);
      if (section) {
        section.innerHTML = `<div class="submit-confirmation">
          <h2>${t("prediction.error.title")}</h2>
          <p>${t("prediction.error.message")}</p>
          <p class="counter-text" dir="auto" style="font-size:12px;opacity:0.7;">${err instanceof Error ? err.message : String(err)}</p>
        </div>`;
      }
    }
  }

  private buildNavButtons(opts: {
    backLabel?: string;
    onBack?: () => void;
    nextLabel: string;
    nextEnabled: boolean;
    onNext: () => void;
  }): HTMLElement {
    const nav = document.createElement("div");
    nav.className = "prediction-nav";

    if (opts.backLabel && opts.onBack) {
      const backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "btn-secondary";
      backBtn.textContent = opts.backLabel;
      backBtn.addEventListener("click", opts.onBack);
      nav.appendChild(backBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn-primary";
    nextBtn.textContent = opts.nextLabel;
    nextBtn.disabled = !opts.nextEnabled;
    nextBtn.addEventListener("click", opts.onNext);
    nav.appendChild(nextBtn);

    return nav;
  }
}
