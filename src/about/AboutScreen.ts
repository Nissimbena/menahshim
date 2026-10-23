/**
 * "מי אנחנו" (about us) screen - builds trust/credibility by putting a real
 * face behind the site (especially important for a predictions/prizes site,
 * to stand apart from scammy-feeling gambling sites). Content below is a
 * placeholder - swap in a real photo + short bio.
 */
import { t } from "../i18n/i18n";
import { screenHeader } from "../ui/ScreenHeader";
import { icon } from "../ui/icons";
import { el } from "../ui/dom";

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

  private render() {
    this.container.innerHTML = "";

    const wrapper = el("div", "screen reading about");
    wrapper.appendChild(screenHeader({ title: t("about.title"), onBack: () => this.onBack() }));

    const article = el("article", "reading__section");
    article.innerHTML = `
      <div class="about__intro">
        <img class="about__photo" src="about-photo.jpg" alt="${t("about.photoAlt")}" width="96" height="96" />
        <p dir="auto">${t("about.intro")}</p>
      </div>
      <h2>${t("about.highlightsTitle")}</h2>
      <ul class="about__highlights">
        <li dir="auto"><strong>${t("about.nonProfitTitle")}:</strong> ${t("about.nonProfitText")}</li>
        <li dir="auto"><strong>${t("about.prizesTitle")}:</strong> ${t("about.prizesText")}</li>
      </ul>
      <p dir="auto">${t("about.feedback")}</p>
      <p dir="auto">${t("about.closing")}<br />${t("about.cheer")}</p>
      <div class="card about__contact">
        <span class="list-row__icon">${icon("user")}</span>
        <div class="list-row__main">
          <span class="list-row__meta">${t("about.contactAvailable")}</span>
          <span class="list-row__title" dir="auto">${t("about.contactName")} · <a class="num" href="tel:+972542538749" dir="ltr">054-2538749</a></span>
        </div>
      </div>
    `;
    wrapper.appendChild(article);

    this.container.appendChild(wrapper);
  }
}
