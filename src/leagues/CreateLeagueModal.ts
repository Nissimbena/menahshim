import { createLeague } from "../api/backend";
import { t } from "../i18n/i18n";

/** Modal for creating a private league: enter a name, get a shareable join link. */
export class CreateLeagueModal {
  private overlay: HTMLElement | null = null;
  private onCreated: (leagueId: string, name: string) => void;

  constructor(onCreated: (leagueId: string, name: string) => void) {
    this.onCreated = onCreated;
  }

  show() {
    if (this.overlay) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <h2>${t("league.create.title")}</h2>
        <p>${t("league.create.subtitle")}</p>
        <input type="text" class="nickname-input" maxlength="60" placeholder="${t("league.create.placeholder")}" />
        <p class="nickname-error"></p>
        <div class="league-result hidden">
          <p>${t("league.create.success")}</p>
          <input type="text" class="league-link-input" readonly />
          <button type="button" class="btn-secondary league-copy-btn">${t("league.create.copyLink")}</button>
        </div>
        <button type="button" class="btn-primary league-create-btn">${t("league.create.createBtn")}</button>
        <button type="button" class="btn-secondary league-close-btn">${t("league.create.closeBtn")}</button>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    const input = overlay.querySelector<HTMLInputElement>(".nickname-input")!;
    const errorEl = overlay.querySelector<HTMLElement>(".nickname-error")!;
    const createBtn =
      overlay.querySelector<HTMLButtonElement>(".league-create-btn")!;
    const closeBtn =
      overlay.querySelector<HTMLButtonElement>(".league-close-btn")!;
    const resultBox = overlay.querySelector<HTMLElement>(".league-result")!;
    const linkInput =
      overlay.querySelector<HTMLInputElement>(".league-link-input")!;
    const copyBtn =
      overlay.querySelector<HTMLButtonElement>(".league-copy-btn")!;

    const submit = async () => {
      const name = input.value.trim();
      if (name.length < 2 || name.length > 60) {
        errorEl.textContent = t("league.create.errorLength");
        return;
      }
      createBtn.disabled = true;
      try {
        const league = await createLeague(name);
        const link = `${window.location.origin}${window.location.pathname}?league=${league.inviteCode}`;
        linkInput.value = link;
        resultBox.classList.remove("hidden");
        input.classList.add("hidden");
        createBtn.classList.add("hidden");
        errorEl.textContent = "";
        this.onCreated(league.id, league.name);
      } catch (err) {
        console.error("Failed to create league:", err);
        errorEl.textContent = t("league.create.error");
        createBtn.disabled = false;
      }
    };

    createBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(linkInput.value);
      copyBtn.textContent = t("league.create.copied");
      setTimeout(
        () => (copyBtn.textContent = t("league.create.copyLink")),
        1500,
      );
    });
    closeBtn.addEventListener("click", () => this.hide());
    input.focus();
  }

  hide() {
    this.overlay?.remove();
    this.overlay = null;
  }
}
