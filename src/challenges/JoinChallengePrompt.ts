import { getChallenge, acceptChallenge, type Challenge } from "../api/backend";
import { auth, signInWithGoogle } from "../firebase/firebase";
import { t } from "../i18n/i18n";

function statusMessage(status: Challenge["status"]): string {
  switch (status) {
    case "active":
      return t("challenge.join.statusActive");
    case "resolved":
      return t("challenge.join.statusResolved");
    case "cancelled":
      return t("challenge.join.statusCancelled");
    default:
      return "";
  }
}

/** Shown when the URL has a `?challenge=<id>` join link. Lets the visitor sign in (if needed) and accept the bet. */
export class JoinChallengePrompt {
  private overlay: HTMLElement | null = null;

  async show(challengeId: string, onJoined: () => void) {
    if (this.overlay) return;

    let challenge: Challenge;
    try {
      challenge = await getChallenge(challengeId);
    } catch (err) {
      console.warn("Could not load challenge:", err);
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    this.overlay = overlay;

    if (challenge.status !== "pending") {
      overlay.innerHTML = `
        <div class="modal-box">
          <h2>${t("challenge.modal.title")}</h2>
          <p dir="auto">${statusMessage(challenge.status)}</p>
          <button type="button" class="btn-secondary challenge-cancel-btn">${t("league.create.closeBtn")}</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay
        .querySelector(".challenge-cancel-btn")
        ?.addEventListener("click", () => this.hide());
      return;
    }

    if (auth.currentUser?.uid === challenge.creatorUid) {
      overlay.innerHTML = `
        <div class="modal-box">
          <h2>${t("challenge.modal.title")}</h2>
          <p dir="auto">${t("challenge.join.ownChallenge")}</p>
          <button type="button" class="btn-secondary challenge-cancel-btn">${t("league.create.closeBtn")}</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay
        .querySelector(".challenge-cancel-btn")
        ?.addEventListener("click", () => this.hide());
      return;
    }

    overlay.innerHTML = `
      <div class="modal-box">
        <h2>${t("challenge.modal.title")}</h2>
        <p dir="auto">${t("challenge.join.challengerLine", { name: challenge.creatorName })}</p>
        <p class="bonus-question-text" dir="auto">${challenge.question}</p>
        <p dir="auto">${t("challenge.join.creatorGuess", { name: challenge.creatorName })} <strong>${challenge.creatorAnswer ? t("common.yes") : t("common.no")}</strong></p>
        <p dir="auto">${t("challenge.join.yourSide", { answer: challenge.creatorAnswer ? t("common.no") : t("common.yes"), points: challenge.points })}</p>
        <p class="nickname-error"></p>
        <button type="button" class="btn-primary challenge-join-btn">${t("challenge.join.joinBtn")}</button>
        <button type="button" class="btn-secondary challenge-cancel-btn">${t("challenge.join.notNow")}</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const errorEl = overlay.querySelector<HTMLElement>(".nickname-error")!;
    const joinBtn = overlay.querySelector<HTMLButtonElement>(
      ".challenge-join-btn",
    )!;
    const cancelBtn = overlay.querySelector<HTMLButtonElement>(
      ".challenge-cancel-btn",
    )!;

    joinBtn.addEventListener("click", async () => {
      joinBtn.disabled = true;
      try {
        if (!auth.currentUser) await signInWithGoogle();
        await acceptChallenge(challengeId);
        this.hide();
        onJoined();
      } catch (err) {
        console.error("Failed to accept challenge:", err);
        errorEl.textContent =
          err instanceof Error ? err.message : t("challenge.join.errorGeneric");
        joinBtn.disabled = false;
      }
    });
    cancelBtn.addEventListener("click", () => this.hide());
  }

  hide() {
    this.overlay?.remove();
    this.overlay = null;
  }
}
