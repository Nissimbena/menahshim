import { getMyChallenges, type Challenge } from "../api/backend";
import { auth } from "../firebase/firebase";
import { t } from "../i18n/i18n";
import { screenHeader } from "../ui/ScreenHeader";

/**
 * Lists every challenge the signed-in user is involved in (as creator or
 * opponent). Lets someone who created a challenge but hasn't shared it yet
 * (or shared it but the friend hasn't accepted) find it again and re-share
 * the link - otherwise a closed CreateChallengeModal has no other way back
 * to that link.
 */
export class MyChallengesScreen {
  private container: HTMLElement;
  private onBack: () => void;

  constructor(container: HTMLElement, onBack: () => void) {
    this.container = container;
    this.onBack = onBack;
  }

  show() {
    this.container.classList.remove("hidden");
    this.renderLoading();
    getMyChallenges()
      .then((challenges) => this.render(challenges))
      .catch((err) => {
        console.error("Failed to load my challenges:", err);
        this.renderError();
      });
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private renderHeader(): HTMLElement {
    const header = screenHeader({ title: t("myChallenges.title"), onBack: () => this.onBack() });
    return header;
  }

  private renderLoading() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "screen";
    wrapper.appendChild(this.renderHeader());
    const p = document.createElement("p");
    p.className = "counter-text";
    p.textContent = t("common.loading");
    wrapper.appendChild(p);
    this.container.appendChild(wrapper);
  }

  private renderError() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "screen";
    wrapper.appendChild(this.renderHeader());
    const p = document.createElement("p");
    p.className = "counter-text";
    p.textContent = t("myChallenges.error");
    wrapper.appendChild(p);
    this.container.appendChild(wrapper);
  }

  private render(challenges: Challenge[]) {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "screen";
    wrapper.appendChild(this.renderHeader());

    if (challenges.length === 0) {
      const empty = document.createElement("p");
      empty.className = "counter-text";
      empty.textContent = t("myChallenges.empty");
      wrapper.appendChild(empty);
      this.container.appendChild(wrapper);
      return;
    }

    const myUid = auth.currentUser?.uid;
    const statusLabel: Record<Challenge["status"], string> = {
      pending: t("admin.challenges.statusPending"),
      active: t("admin.challenges.statusActive"),
      resolved: t("admin.challenges.statusResolved"),
      cancelled: t("admin.challenges.statusCancelled"),
    };

    const list = document.createElement("div");
    list.className = "challenge-admin-list";

    challenges.forEach((c) => {
      const card = document.createElement("div");
      card.className = "challenge-admin-card";

      const creatorIsMe = c.creatorUid === myUid;
      const creatorLabel = `${c.creatorName}${creatorIsMe ? ` ${t("myChallenges.you")}` : ""}`;
      const opponentLabel = c.opponentName
        ? `${c.opponentName}${!creatorIsMe ? ` ${t("myChallenges.you")}` : ""}`
        : t("admin.challenges.noOpponent");

      card.innerHTML = `
        <div class="challenge-admin-meta">#${c.id} &middot; ${t("admin.challenges.game")} ${c.gameId} &middot; ${statusLabel[c.status]}</div>
        <p class="bonus-question-text" dir="auto">${c.question}</p>
        <p dir="auto">${creatorLabel}: <strong>${c.creatorAnswer ? t("common.yes") : t("common.no")}</strong> &nbsp;|&nbsp; ${opponentLabel}${c.opponentName ? `: <strong>${c.creatorAnswer ? t("common.no") : t("common.yes")}</strong>` : ""}</p>
      `;

      if (c.status === "resolved") {
        const winnerName =
          c.winnerUid === c.creatorUid ? c.creatorName : c.opponentName;
        const resultLine = document.createElement("p");
        resultLine.dir = "auto";
        resultLine.innerHTML = t("admin.challenges.winnerLabel", {
          name: `<strong>${winnerName}</strong>`,
        });
        card.appendChild(resultLine);
      }

      if (c.status === "cancelled" && c.cancellationReason) {
        const reasonLine = document.createElement("p");
        reasonLine.dir = "auto";
        reasonLine.textContent = t("challenge.cancelNotice.reasonLabel", {
          reason: c.cancellationReason,
        });
        card.appendChild(reasonLine);
      }

      if (c.status === "pending" && creatorIsMe) {
        card.appendChild(this.renderShareAgain(c));
      }

      list.appendChild(card);
    });

    wrapper.appendChild(list);
    this.container.appendChild(wrapper);
  }

  private renderShareAgain(challenge: Challenge): HTMLElement {
    const box = document.createElement("div");
    box.className = "challenge-share-again";

    const link = `${window.location.origin}${window.location.pathname}?challenge=${challenge.id}`;
    const message = t("challenge.modal.whatsappMessage", {
      question: challenge.question,
      link,
    });

    box.innerHTML = `
      <p>${t("myChallenges.shareAgain")}</p>
      <input type="text" class="league-link-input" readonly value="${link}" />
      <div class="challenge-share-buttons">
        <button type="button" class="btn-secondary league-copy-btn">${t("league.create.copyLink")}</button>
        <button type="button" class="btn-primary challenge-whatsapp-btn">${t("challenge.modal.whatsappBtn")}</button>
      </div>
    `;

    const linkInput =
      box.querySelector<HTMLInputElement>(".league-link-input")!;
    const copyBtn = box.querySelector<HTMLButtonElement>(".league-copy-btn")!;
    const whatsappBtn = box.querySelector<HTMLButtonElement>(
      ".challenge-whatsapp-btn",
    )!;

    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(linkInput.value);
      copyBtn.textContent = t("league.create.copied");
      setTimeout(
        () => (copyBtn.textContent = t("league.create.copyLink")),
        1500,
      );
    });
    whatsappBtn.addEventListener("click", () => {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
    });

    return box;
  }
}
