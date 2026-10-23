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
import { predictionCompare } from "../prediction/recap";
import { t } from "../i18n/i18n";
import { esc } from "../ui/dom";

/**
 * Read-only "what did this person bet" modal, opened by clicking a name on
 * a per-game leaderboard table. Uses the same predicted-vs-actual view as
 * PredictionScreen's own recap (and so the exact same scoring helpers), so
 * the per-row points can never drift from what the server actually paid.
 */
export class UserPredictionModal {
  private overlay: HTMLElement | null = null;

  async show(gameId: string, uid: string, displayName: string) {
    if (this.overlay) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box user-prediction-modal-box" role="dialog" aria-modal="true">
        <h2 dir="auto">${t("leaderboard.userPrediction.title", { name: esc(displayName) })}</h2>
        <div class="skeleton-stack" aria-busy="true"><span class="skeleton skeleton--title"></span><span class="skeleton skeleton--card"></span></div>
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
      <h2 dir="auto">${t("leaderboard.userPrediction.title", { name: esc(displayName) })}</h2>
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
    heading.textContent = t("leaderboard.userPrediction.title", { name: displayName });
    box.appendChild(heading);

    if (!prediction) {
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = t("leaderboard.userPrediction.none");
      box.appendChild(p);
    } else {
      box.appendChild(
        predictionCompare({
          prediction,
          result,
          rules,
          gameId,
          playerById: (id) => players.find((pl) => pl.id === id),
          total: prediction.score,
          predictedLabel: t("leaderboard.userPrediction.theirSide"),
        }),
      );
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
