import { auth, signOutUser } from "../firebase/firebase";
import { deleteMyAccount, reportClientError } from "../api/backend";
import { t } from "../i18n/i18n";

/**
 * Static privacy-policy explanation screen ("מדיניות פרטיות") - what data the
 * app collects, why, and how a user can ask to delete/access it. Same visual
 * pattern as ScoringInfoScreen (shared .leaderboard-wrapper/.prediction-header).
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

  private renderHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "prediction-header";
    header.innerHTML = `
      <button class="btn-back" type="button">&rarr; ${t("common.back")}</button>
      <div class="prediction-title"><h1>${t("privacy.title")}</h1></div>
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
      const section = document.createElement("div");
      section.className = "scoring-rule-card";

      const heading = document.createElement("h4");
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
    const section = document.createElement("div");
    section.className = "scoring-rule-card";

    const heading = document.createElement("h4");
    heading.textContent = t("privacy.delete.title");
    section.appendChild(heading);

    const p = document.createElement("p");
    p.dir = "auto";
    p.textContent = t("privacy.delete.desc");
    section.appendChild(p);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary privacy-delete-btn";
    btn.textContent = t("privacy.delete.title");
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
