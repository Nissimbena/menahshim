import {
  getChallengeEligibility,
  createChallenge,
  type ChallengeEligibility,
} from "../api/backend";
import { t } from "../i18n/i18n";

const CHALLENGE_POINTS = 10;

/**
 * Modal for challenging a friend: write a yes/no question, pick your own
 * answer, get a shareable link. Gated on having at least 10 points and not
 * already being in an open challenge for this game (checked server-side too).
 */
export class CreateChallengeModal {
  private overlay: HTMLElement | null = null;
  private gameId: string | null = null;
  private onCreated: () => void = () => {};

  show(gameId: string, onCreated: () => void) {
    if (this.overlay) return;
    this.gameId = gameId;
    this.onCreated = onCreated;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <h2>${t("challenge.modal.title")}</h2>
        <div class="skeleton-stack" aria-busy="true"><span class="skeleton skeleton--line"></span><span class="skeleton skeleton--line"></span></div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    getChallengeEligibility(gameId)
      .then((eligibility) => this.renderBody(eligibility))
      .catch((err) => {
        console.error("Failed to check challenge eligibility:", err);
        this.renderError(t("challenge.modal.checkError"));
      });
  }

  private renderError(message: string) {
    if (!this.overlay) return;
    const box = this.overlay.querySelector(".modal-box")!;
    box.innerHTML = `
      <h2>${t("challenge.modal.title")}</h2>
      <p dir="auto">${message}</p>
      <button type="button" class="btn-secondary challenge-close-btn">${t("league.create.closeBtn")}</button>
    `;
    box
      .querySelector(".challenge-close-btn")
      ?.addEventListener("click", () => this.hide());
  }

  private renderBody(eligibility: ChallengeEligibility) {
    if (!this.overlay || !this.gameId) return;
    const box = this.overlay.querySelector(".modal-box")!;

    if (eligibility.alreadyInChallenge) {
      this.renderError(t("challenge.modal.alreadyInChallenge"));
      return;
    }
    if (!eligibility.eligible) {
      this.renderError(
        t("challenge.modal.notEnoughPoints", {
          score: eligibility.totalScore,
          points: CHALLENGE_POINTS,
        }),
      );
      return;
    }

    let creatorAnswer: boolean | null = null;

    box.innerHTML = `
      <h2>${t("challenge.modal.title")}</h2>
      <p>${t("challenge.modal.intro")}</p>
      <textarea class="nickname-input challenge-question-input" maxlength="300" rows="3" placeholder="${t("challenge.modal.placeholder")}" dir="auto"></textarea>
      <div class="bonus-question-buttons challenge-answer-buttons">
        <button type="button" class="btn-secondary bonus-question-choice" data-answer="true">${t("common.yes")}</button>
        <button type="button" class="btn-secondary bonus-question-choice" data-answer="false">${t("common.no")}</button>
      </div>
      <p class="nickname-error"></p>
      <div class="league-result hidden">
        <p>${t("challenge.modal.created")}</p>
        <input type="text" class="league-link-input" readonly />
        <div class="challenge-share-buttons">
          <button type="button" class="btn-secondary league-copy-btn">${t("league.create.copyLink")}</button>
          <button type="button" class="btn-primary challenge-whatsapp-btn">${t("challenge.modal.whatsappBtn")}</button>
        </div>
      </div>
      <button type="button" class="btn-primary challenge-create-btn" disabled>${t("challenge.modal.createBtn")}</button>
      <button type="button" class="btn-secondary challenge-close-btn">${t("league.create.closeBtn")}</button>
    `;

    const questionInput = box.querySelector<HTMLTextAreaElement>(
      ".challenge-question-input",
    )!;
    const errorEl = box.querySelector<HTMLElement>(".nickname-error")!;
    const createBtn = box.querySelector<HTMLButtonElement>(
      ".challenge-create-btn",
    )!;
    const closeBtn = box.querySelector<HTMLButtonElement>(
      ".challenge-close-btn",
    )!;
    const resultBox = box.querySelector<HTMLElement>(".league-result")!;
    const linkInput =
      box.querySelector<HTMLInputElement>(".league-link-input")!;
    const copyBtn = box.querySelector<HTMLButtonElement>(".league-copy-btn")!;
    const whatsappBtn = box.querySelector<HTMLButtonElement>(
      ".challenge-whatsapp-btn",
    )!;
    const answerButtons = box.querySelectorAll<HTMLButtonElement>(
      ".bonus-question-choice",
    );

    const refreshCreateEnabled = () => {
      createBtn.disabled =
        creatorAnswer === null || questionInput.value.trim().length < 3;
    };

    answerButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        creatorAnswer = btn.dataset.answer === "true";
        answerButtons.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        refreshCreateEnabled();
      });
    });
    questionInput.addEventListener("input", refreshCreateEnabled);

    createBtn.addEventListener("click", async () => {
      const question = questionInput.value.trim();
      if (question.length < 3 || question.length > 300) {
        errorEl.textContent = t("challenge.modal.errorLength");
        return;
      }
      if (creatorAnswer === null) return;

      createBtn.disabled = true;
      try {
        const { id } = await createChallenge({
          gameId: this.gameId!,
          question,
          creatorAnswer,
        });
        const link = `${window.location.origin}${window.location.pathname}?challenge=${id}`;
        linkInput.value = link;
        whatsappBtn.dataset.message = t("challenge.modal.whatsappMessage", {
          question,
          link,
        });
        resultBox.classList.remove("hidden");
        questionInput.classList.add("hidden");
        box.querySelector(".challenge-answer-buttons")?.classList.add("hidden");
        createBtn.classList.add("hidden");
        errorEl.textContent = "";
        this.onCreated();
      } catch (err) {
        console.error("Failed to create challenge:", err);
        errorEl.textContent =
          err instanceof Error
            ? err.message
            : t("challenge.modal.errorGeneric");
        createBtn.disabled = false;
      }
    });

    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(linkInput.value);
      copyBtn.textContent = t("league.create.copied");
      setTimeout(
        () => (copyBtn.textContent = t("league.create.copyLink")),
        1500,
      );
    });
    whatsappBtn.addEventListener("click", () => {
      const message = whatsappBtn.dataset.message ?? linkInput.value;
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
    });
    closeBtn.addEventListener("click", () => this.hide());
    questionInput.focus();
  }

  hide() {
    this.overlay?.remove();
    this.overlay = null;
    this.gameId = null;
  }
}
