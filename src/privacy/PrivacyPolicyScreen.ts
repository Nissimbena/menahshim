import { auth, signOutUser } from "../firebase/firebase";
import { deleteMyAccount, reportClientError } from "../api/backend";
import { t } from "../i18n/i18n";
import { screenHeader } from "../ui/ScreenHeader";
import { icon } from "../ui/icons";
import { el } from "../ui/dom";

/**
 * Static privacy-policy explanation screen ("מדיניות פרטיות") - what data the
 * app collects, why, and how a user can ask to delete/access it. Same visual
 * pattern as the other info screens (shared screenHeader + .reading column).
 */
export class PrivacyPolicyScreen {
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

    const wrapper = el("div", "screen reading");
    wrapper.appendChild(screenHeader({ title: t("privacy.title"), onBack: () => this.onBack() }));

    const sections: { title: string; rows: string[] }[] = [
      {
        title: t("privacy.s1.title"),
        rows: [
          t("privacy.s1.r1"),
          t("privacy.s1.r2"),
          t("privacy.s1.r3"),
          t("privacy.s1.r4"),
        ],
      },
      {
        title: t("privacy.s2.title"),
        rows: [t("privacy.s2.r1"), t("privacy.s2.r2"), t("privacy.s2.r3")],
      },
      {
        title: t("privacy.s3.title"),
        rows: [t("privacy.s3.r1"), t("privacy.s3.r2")],
      },
      {
        title: t("privacy.s4.title"),
        rows: [t("privacy.s4.r1"), t("privacy.s4.r2")],
      },
    ];

    sections.forEach(({ title, rows }) => {
      const section = el("section", "reading__section");

      const heading = document.createElement("h2");
      heading.textContent = title;
      section.appendChild(heading);

      rows.forEach((text) => {
        const p = document.createElement("p");
        p.dir = "auto";
        p.textContent = text;
        section.appendChild(p);
      });

      wrapper.appendChild(section);
    });

    if (auth.currentUser) wrapper.appendChild(this.renderDeleteSection());

    this.container.appendChild(wrapper);
  }

  private renderDeleteSection(): HTMLElement {
    const section = el("section", "reading__section card danger-zone");

    const heading = document.createElement("h2");
    heading.textContent = t("privacy.delete.title");
    section.appendChild(heading);

    const p = document.createElement("p");
    p.dir = "auto";
    p.textContent = t("privacy.delete.desc");
    section.appendChild(p);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--secondary privacy-delete-btn";
    btn.innerHTML = `${icon("alert")}<span>${t("privacy.delete.title")}</span>`;
    btn.addEventListener("click", () => {
      if (!confirm(t("privacy.delete.confirm"))) return;
      deleteMyAccount()
        .then(() => {
          signOutUser();
          this.onBack();
        })
        .catch((e) => {
          console.error(e);
          reportClientError(
            e instanceof Error ? e.message : String(e),
            "PrivacyPolicyScreen:deleteAccount",
          );
          alert(t("privacy.delete.failed"));
        });
    });
    section.appendChild(btn);

    return section;
  }
}
