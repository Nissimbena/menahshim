/**
 * "מי אנחנו" (about us) screen - builds trust/credibility by putting a real
 * face behind the site (especially important for a predictions/prizes site,
 * to stand apart from scammy-feeling gambling sites). Content below is a
 * placeholder - swap in a real photo + short bio.
 */
import { t } from "../i18n/i18n";

export class AboutScreen {
  private container: HTMLElement;
  private onBack: () => void;

  constructor(container: HTMLElement, onBack: () => void) {
    this.container = container;
    this.onBack = onBack;
  }

  show() {
    this.container.classList.remove("hidden");
    this.render();
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private renderHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "prediction-header";
    header.innerHTML = `
      <button class="btn-back" type="button">&rarr; ${t("common.back")}</button>
      <div class="prediction-title"><h1>${t("about.title")}</h1></div>
      <div class="prediction-header-spacer"></div>
    `;
    header
      .querySelector(".btn-back")
      ?.addEventListener("click", () => this.onBack());
    return header;
  }

  private render() {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());

    const card = document.createElement("div");
    card.className = "scoring-rule-card about-card";
    card.innerHTML = `
      <img class="about-photo" src="about-photo.jpg" alt="Nisim" />
      <p dir="auto">${t("about.intro")}</p>
      <h4>${t("about.highlightsTitle")}</h4>
      <ul class="about-highlights">
        <li dir="auto"><strong>${t("about.nonProfitTitle")}:</strong> ${t("about.nonProfitText")}</li>
        <li dir="auto"><strong>${t("about.prizesTitle")}:</strong> ${t("about.prizesText")}</li>
      </ul>
      <p dir="auto">${t("about.feedback")}</p>
      <p dir="auto">${t("about.closing")}<br />${t("about.cheer")}</p>
      <p class="about-contact" dir="auto">${t("about.contactAvailable")} ניסים<br />0542538749</p>
    `;
    wrapper.appendChild(card);

    this.container.appendChild(wrapper);
  }
}
