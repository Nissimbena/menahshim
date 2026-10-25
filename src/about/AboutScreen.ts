/**
 * "מי אנחנו" (about us) screen - builds trust/credibility by putting a real
 * face behind the site (especially important for a predictions/prizes site,
 * to stand apart from scammy-feeling gambling sites). Content below is a
 * placeholder - swap in a real photo + short bio.
 */
import { t } from "../i18n/i18n";
import { screenHeader } from "../ui/ScreenHeader";
import { icon } from "../ui/icons";
import { el, esc } from "../ui/dom";

/** The people behind the design and the photos. */
const CREDITS = [
  {
    nameKey: "about.credits.omer.name",
    roleKey: "about.credits.omer.role",
    photo: "team/omer.webp",
    phone: "052-580-3999",
    tel: "+972525803999",
    instagram: "https://www.instagram.com/mishxgraphics/",
    handle: "@mishxgraphics",
  },
  {
    nameKey: "about.credits.nadav.name",
    roleKey: "about.credits.nadav.role",
    photo: "team/nadav.webp",
    phone: "052-251-6044",
    tel: "+972522516044",
    instagram: "https://www.instagram.com/n.m_photography17/",
    handle: "@n.m_photography17",
  },
] as const;

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
    wrapper.appendChild(this.renderCredits());

    this.container.appendChild(wrapper);
  }

  /** Design & photography credits: photo, name, role, phone and Instagram. */
  private renderCredits(): HTMLElement {
    const section = el("section", "credits");
    section.setAttribute("aria-labelledby", "credits-title");
    section.innerHTML = `<h2 id="credits-title" class="credits__title">${t("about.credits.title")}</h2>`;
    const list = el("ul", "credits__list");
    CREDITS.forEach((c) => {
      const name = t(c.nameKey);
      const li = el("li", "card credit");
      li.innerHTML = `
        <img class="credit__photo" src="${import.meta.env.BASE_URL}${c.photo}" alt="${esc(name)}" width="96" height="96" loading="lazy" />
        <div class="credit__text">
          <span class="credit__role">${esc(t(c.roleKey))}</span>
          <span class="credit__name" dir="auto">${esc(name)}</span>
        </div>
        <div class="credit__actions">
          <a class="credit__link" href="${c.instagram}" target="_blank" rel="noopener noreferrer"
             aria-label="${esc(t("about.credits.instagramOf", { name }))}">
            ${icon("instagram")}<span dir="ltr">${c.handle}</span>
          </a>
          <a class="credit__link" href="tel:${c.tel}" aria-label="${esc(t("about.credits.callOf", { name }))}">
            ${icon("phone")}<span dir="ltr">${c.phone}</span>
          </a>
        </div>`;
      list.appendChild(li);
    });
    section.appendChild(list);
    return section;
  }
}
