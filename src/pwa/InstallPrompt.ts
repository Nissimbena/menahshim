const DISMISS_KEY = "installPromptDismissed";
import { t } from "../i18n/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** True once running as an installed PWA (home-screen shortcut / standalone window) - false for a regular browser tab. */
export function isRunningStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Asks the visitor if they'd like to add a home-screen shortcut, using the
 * browser's native "beforeinstallprompt" capability. Shown again on every
 * visit unless the visitor explicitly clicks "don't ask again" (persisted
 * in localStorage) - just closing/ignoring it does NOT suppress it.
 */
export class InstallPrompt {
  private deferredEvent: BeforeInstallPromptEvent | null = null;
  private overlay: HTMLElement | null = null;

  constructor() {
    window.addEventListener("beforeinstallprompt", (e: Event) => {
      e.preventDefault();
      this.deferredEvent = e as BeforeInstallPromptEvent;
      if (localStorage.getItem(DISMISS_KEY) !== "1") this.show();
    });
  }

  /** Explicit click on a visible "install the app" button - always shows, ignoring the automatic popup's "don't ask again" dismissal. */
  showManual() {
    if (this.deferredEvent) {
      this.show(true);
    } else {
      this.showManualInstructions();
    }
  }

  private show(force = false) {
    if (this.overlay || (!force && localStorage.getItem(DISMISS_KEY) === "1"))
      return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <h2>${t("install.title")}</h2>
        <p dir="auto">${t("install.prompt")}</p>
        <div class="install-prompt-actions">
          <button type="button" class="btn-primary install-yes-btn">${t("install.yes")}</button>
          <button type="button" class="btn-secondary install-never-btn">${t("install.never")}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    overlay
      .querySelector(".install-yes-btn")
      ?.addEventListener("click", async () => {
        const event = this.deferredEvent;
        this.hide();
        if (event) {
          event.prompt();
          try {
            await event.userChoice;
          } catch (err) {
            console.warn("Install prompt userChoice failed:", err);
          }
        }
      });

    overlay
      .querySelector(".install-never-btn")
      ?.addEventListener("click", () => {
        localStorage.setItem(DISMISS_KEY, "1");
        this.hide();
      });
  }

  /** Fallback for browsers with no "beforeinstallprompt" support (iOS Safari, some others) - manual step-by-step instructions instead. */
  private showManualInstructions() {
    if (this.overlay) return;

    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const steps = isIos ? t("install.stepsIos") : t("install.stepsOther");

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <h2>${t("install.title")}</h2>
        <p dir="auto">${steps}</p>
        <div class="install-prompt-actions">
          <button type="button" class="btn-primary install-ok-btn">${t("install.ok")}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    overlay
      .querySelector(".install-ok-btn")
      ?.addEventListener("click", () => this.hide());
  }

  private hide() {
    this.overlay?.remove();
    this.overlay = null;
  }
}
