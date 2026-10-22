import {
  getUserPredictionForGame,
  getGameResult,
  getScoringRules,
  getPlayers,
  type MyPrediction,
  type GameResultData,
  type ScoringRules,
} from "../api/backend";
import type { Player } from "../prediction/types";
import {
  CATEGORY_ORDER,
  CATEGORY_CONFIG,
  topStatPoints,
  finalScorePoints,
  teamStatPoints,
} from "../prediction/PredictionScreen";
import { getBonusQuestion } from "../schedule/schedule";
import { t, tDynamic } from "../i18n/i18n";

/**
 * Read-only "what did this person bet" modal, opened by clicking a name on
 * a per-game leaderboard table. Mirrors PredictionScreen's own post-game
 * recap table, reusing the exact same scoring-tier helper functions so the
 * displayed per-row points can never drift from what the server actually paid.
 */
export class UserPredictionModal {
  private overlay: HTMLElement | null = null;

  async show(gameId: string, uid: string, displayName: string) {
    if (this.overlay) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box user-prediction-modal-box">
        <h2 dir="auto">${t("leaderboard.userPrediction.title", { name: displayName })}</h2>
        <p class="counter-text">${t("common.loading")}</p>
      </div>
    `;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.hide();
    });
    document.body.appendChild(overlay);
    this.overlay = overlay;

    try {
      const [prediction, result, rules, players] = await Promise.all([
        getUserPredictionForGame(gameId, uid),
        getGameResult(gameId),
        getScoringRules(),
        getPlayers(),
      ]);
      this.render(gameId, displayName, prediction, result, rules, players);
    } catch (err) {
      console.error("Failed to load user prediction:", err);
      this.renderError(displayName);
    }
  }

  private renderError(displayName: string) {
    if (!this.overlay) return;
    const box = this.overlay.querySelector(".modal-box")!;
    box.innerHTML = `
      <h2 dir="auto">${t("leaderboard.userPrediction.title", { name: displayName })}</h2>
      <p dir="auto">${t("leaderboard.userPrediction.error")}</p>
      <button type="button" class="btn-secondary user-prediction-close-btn">${t("league.create.closeBtn")}</button>
    `;
    box
      .querySelector(".user-prediction-close-btn")
      ?.addEventListener("click", () => this.hide());
  }

  private render(
    gameId: string,
    displayName: string,
    prediction: MyPrediction | null,
    result: GameResultData | null,
    rules: ScoringRules,
    players: Player[],
  ) {
    if (!this.overlay) return;
    const box = this.overlay.querySelector(".modal-box")!;
    box.innerHTML = "";

    const heading = document.createElement("h2");
    heading.dir = "auto";
    heading.textContent = t("leaderboard.userPrediction.title", {
      name: displayName,
    });
    box.appendChild(heading);

    if (!prediction) {
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = t("leaderboard.userPrediction.none");
      box.appendChild(p);
    } else {
      const playerById = (id: string) => players.find((pl) => pl.id === id);

      type Row = {
        label: string;
        predicted: string;
        actual: string;
        points: number;
      };
      const rows: Row[] = [];

      const pHome = prediction.predictedHomeScore;
      const pAway = prediction.predictedAwayScore;
      const aHome = result?.actualHomeScore ?? null;
      const aAway = result?.actualAwayScore ?? null;
      rows.push({
        label: t("prediction.step.score"),
        predicted:
          pHome !== null && pAway !== null ? `${pHome} - ${pAway}` : "-",
        actual: aHome !== null && aAway !== null ? `${aHome} - ${aAway}` : "-",
        points:
          pHome !== null && pAway !== null && aHome !== null && aAway !== null
            ? finalScorePoints(pHome, pAway, aHome, aAway, rules)
            : 0,
      });

      CATEGORY_ORDER.forEach((category) => {
        const config = CATEGORY_CONFIG[category];
        const predictedPlayerId = prediction[config.playerKey];
        const predictedAmount = prediction[config.amountKey];
        const actualPlayerId = result ? result[config.actualPlayerKey] : null;
        const actualAmount = result ? result[config.actualAmountKey] : null;
        const predictedPlayer = predictedPlayerId
          ? playerById(predictedPlayerId)
          : null;
        const actualPlayer = actualPlayerId ? playerById(actualPlayerId) : null;
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
          predicted: prediction.predictedTeamThrees,
          actual: result?.actualTeamThrees ?? null,
        },
        {
          label: t("prediction.breakdown.teamRebounds"),
          predicted: prediction.predictedTeamRebounds,
          actual: result?.actualTeamRebounds ?? null,
        },
        {
          label: t("prediction.breakdown.teamAssists"),
          predicted: prediction.predictedTeamAssists,
          actual: result?.actualTeamAssists ?? null,
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

      const bonusQuestion = getBonusQuestion(gameId);
      if (bonusQuestion && result?.actualBonusAnswer != null) {
        const predicted = prediction.predictedBonusAnswer;
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
            predicted !== null && predicted === actual
              ? bonusQuestion.points
              : 0,
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
      box.appendChild(table);

      if (prediction.score !== null) {
        const totalP = document.createElement("p");
        totalP.className = "counter-text";
        totalP.dir = "auto";
        totalP.textContent = t("prediction.breakdown.totalScore", {
          score: prediction.score,
        });
        box.appendChild(totalP);
      }
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn-secondary user-prediction-close-btn";
    closeBtn.textContent = t("league.create.closeBtn");
    closeBtn.addEventListener("click", () => this.hide());
    box.appendChild(closeBtn);
  }

  hide() {
    this.overlay?.remove();
    this.overlay = null;
  }
}
