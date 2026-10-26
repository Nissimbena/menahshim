import { getLeagueByCode, getMyLeagues, joinLeague } from "../api/backend";
import { auth, signInWithGoogle } from "../firebase/firebase";
import { t } from "../i18n/i18n";

/** Shown when the URL has a `?league=<code>` join link. Lets the visitor sign in (if needed) and join. */
export class JoinLeaguePrompt {
  private overlay: HTMLElement | null = null;

  async show(code: string, onJoined: () => void) {
    if (this.overlay) return;

    let league: { id: string; name: string };
    try {
      league = await getLeagueByCode(code);
    } catch (err) {
      console.warn("Could not load league by code:", err);
      return;
    }

    // Already in (or the creator of) this league - nothing to ask.
    await auth.authStateReady();
    if (auth.currentUser) {
      try {
        const mine = await getMyLeagues();
        if (mine.some((l) => l.id === league.id)) return;
      } catch (err) {
        console.warn("Could not check league membership:", err);
      }
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <h2>${t("league.join.title")}</h2>
        <p dir="auto">${t("league.join.invited", { name: league.name })}</p>
        <p class="nickname-error"></p>
        <button type="button" class="btn-primary league-join-btn">${t("league.join.joinBtn")}</button>
        <button type="button" class="btn-secondary league-cancel-btn">${t("league.join.cancelBtn")}</button>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    const errorEl = overlay.querySelector<HTMLElement>(".nickname-error")!;
    const joinBtn =
      overlay.querySelector<HTMLButtonElement>(".league-join-btn")!;
    const cancelBtn =
      overlay.querySelector<HTMLButtonElement>(".league-cancel-btn")!;

    joinBtn.addEventListener("click", async () => {
      joinBtn.disabled = true;
      try {
        if (!auth.currentUser) await signInWithGoogle();
        await joinLeague(code);
        this.hide();
        onJoined();
      } catch (err) {
        console.error("Failed to join league:", err);
        errorEl.textContent = t("league.join.error");
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
