import { setNickname } from "../api/backend";
import { t } from "../i18n/i18n";

/**
 * First-login nickname modal. Shown once (until the user has a nickname
 * saved server-side); the chosen nickname is what appears on leaderboards.
 */
export class NicknamePrompt {
  private overlay: HTMLElement | null = null;

  show(onDone: (nickname: string) => void) {
    if (this.overlay) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <h2>${t("nickname.title")}</h2>
        <p>${t("nickname.subtitle")}</p>
        <input type="text" class="nickname-input" maxlength="24" placeholder="${t("nickname.placeholder")}" />
        <p class="nickname-error"></p>
        <button type="button" class="btn-primary nickname-save-btn">${t("nickname.save")}</button>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    const input = overlay.querySelector<HTMLInputElement>(".nickname-input")!;
    const errorEl = overlay.querySelector<HTMLElement>(".nickname-error")!;
    const saveBtn =
      overlay.querySelector<HTMLButtonElement>(".nickname-save-btn")!;

    const submit = async () => {
      const nickname = input.value.trim();
      if (nickname.length < 2 || nickname.length > 24) {
        errorEl.textContent = t("nickname.errorLength");
        return;
      }
      saveBtn.disabled = true;
      try {
        await setNickname(nickname);
        this.hide();
        onDone(nickname);
      } catch (err) {
        console.error("Failed to save nickname:", err);
        errorEl.textContent =
          err instanceof Error && err.message.includes("(409)")
            ? t("nickname.errorTaken")
            : `${t("nickname.errorGeneral")} (${err instanceof Error ? err.message : String(err)})`;
        saveBtn.disabled = false;
      }
    };

    saveBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    input.focus();
  }

  hide() {
    this.overlay?.remove();
    this.overlay = null;
  }
}
