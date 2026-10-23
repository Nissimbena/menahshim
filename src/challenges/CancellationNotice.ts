import {
  getUnseenCancellations,
  acknowledgeCancellation,
  type Challenge,
} from "../api/backend";
import { t } from "../i18n/i18n";

/**
 * On app load, shows a one-at-a-time modal for every challenge that was
 * cancelled (by the admin) since the user last saw it, including the
 * cancellation reason if one was given - acknowledges each one (marks it
 * seen for this user specifically) once dismissed.
 */
export class CancellationNotice {
  private overlay: HTMLElement | null = null;
  private queue: Challenge[] = [];

  checkAndShow() {
    getUnseenCancellations()
      .then((challenges) => {
        if (challenges.length === 0) return;
        this.queue = challenges;
        this.showNext();
      })
      .catch((err) =>
        console.warn("Could not load unseen cancellations:", err),
      );
  }

  private showNext() {
    const challenge = this.queue.shift();
    if (!challenge) return;
    if (this.overlay) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <h2>${t("challenge.cancelNotice.title")}</h2>
        <p dir="auto">${t("challenge.cancelNotice.questionLabel", { question: challenge.question })}</p>
        <p dir="auto">${
          challenge.cancellationReason
            ? t("challenge.cancelNotice.reasonLabel", {
                reason: challenge.cancellationReason,
              })
            : t("challenge.cancelNotice.noReason")
        }</p>
        <button type="button" class="btn-primary cancel-notice-ok-btn">${t("install.ok")}</button>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    overlay
      .querySelector(".cancel-notice-ok-btn")
      ?.addEventListener("click", () => {
        acknowledgeCancellation(challenge.id).catch((err) =>
          console.warn("Could not acknowledge cancellation:", err),
        );
        this.hide();
        this.showNext();
      });
  }

  private hide() {
    this.overlay?.remove();
    this.overlay = null;
  }
}
