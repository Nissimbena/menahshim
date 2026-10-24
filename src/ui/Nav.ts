import { t, getLang, setLang, type Lang } from "../i18n/i18n";
import { auth, isAdmin, onAuthChange, signOutUser, type User } from "../firebase/firebase";
import { isRunningStandalone } from "../pwa/InstallPrompt";
import { CHALLENGE_FEATURE_ENABLED, WHATSAPP_GROUP_URL } from "../config/GameConfig";
import { logoSVG } from "../brand/Logo";
import { icon, type IconName } from "./icons";
import { el, esc, avatarHTML } from "./dom";

export type TabId = "home" | "leaderboard" | "leagues" | "more";

export interface NavActions {
  onTab: (tab: Exclude<TabId, "more">) => void;
  onSignIn: () => void;
  onOpenScoringInfo: () => void;
  onOpenTimeKiller: () => void;
  onOpenSportsHub: () => void;
  onCreateLeague: () => void;
  onOpenMyChallenges: () => void;
  onOpenAdmin: () => void;
  onInstall: () => void;
  onOpenAbout: () => void;
  onOpenPrivacy: () => void;
}

const TABS: { id: TabId; icon: IconName; labelKey: string }[] = [
  { id: "home", icon: "home", labelKey: "nav.home" },
  { id: "leaderboard", icon: "chart", labelKey: "nav.leaderboard" },
  { id: "leagues", icon: "users", labelKey: "nav.leagues" },
  { id: "more", icon: "more", labelKey: "nav.more" },
];

/**
 * App chrome: sticky top bar (logo, desktop nav, user chip / sign-in),
 * bottom tab bar on mobile, and the "More" sheet. Mounted once by main.ts.
 */
export class AppNav {
  private actions: NavActions;
  private topbar = el("header", "topbar");
  private tabbar = el("nav", "tabbar");
  private active: TabId | null = "home";
  private user: User | null = auth.currentUser;
  private score: number | null = null;
  private sheet: HTMLElement | null = null;

  constructor(actions: NavActions) {
    this.actions = actions;
    this.tabbar.setAttribute("aria-label", t("nav.label"));
    document.body.prepend(this.topbar);
    // First thing a keyboard / screen-reader user reaches: jump past the nav.
    const skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#main";
    skip.textContent = t("a11y.skipToContent");
    skip.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("main")?.focus();
    });
    document.body.prepend(skip);
    document.body.appendChild(this.tabbar);
    document.body.classList.add("has-tabbar");

    onAuthChange((user) => {
      this.user = user;
      if (!user) this.score = null;
      this.render();
    });
    window.addEventListener("langchange", () => {
      this.render();
      if (this.sheet) {
        this.closeMore();
        this.openMore();
      }
    });
    this.render();
  }

  setActive(tab: TabId | null) {
    this.active = tab;
    this.render();
  }

  setScore(score: number | null) {
    this.score = score;
    this.render();
  }

  /** Focused flows (the prediction wizard) hide the chrome entirely. */
  setFlowMode(on: boolean) {
    document.body.classList.toggle("is-flow", on);
  }

  private render() {
    this.renderTopbar();
    this.renderTabbar();
  }

  private renderTopbar() {
    const inner = el("div", "topbar__inner");

    const brand = el("button", "topbar__brand", logoSVG());
    brand.type = "button";
    brand.setAttribute("aria-label", t("nav.home"));
    brand.addEventListener("click", () => this.select("home"));
    inner.appendChild(brand);

    const nav = el("nav", "topbar__nav");
    nav.setAttribute("aria-label", t("nav.label"));
    TABS.forEach((tab) => {
      const btn = el("button", "topbar__nav-btn");
      btn.type = "button";
      btn.textContent = t(tab.labelKey);
      if (this.active === tab.id) btn.setAttribute("aria-current", "page");
      btn.addEventListener("click", () => this.select(tab.id));
      nav.appendChild(btn);
    });
    inner.appendChild(nav);

    const end = el("div", "topbar__end");
    if (this.user) {
      const chip = el(
        "button",
        "user-chip",
        `${avatarHTML(this.user.displayName ?? this.user.email, this.user.photoURL)}
         <span class="user-chip__score"><span class="num">${this.score ?? "–"}</span><span class="user-chip__unit">${t("nav.pointsShort")}</span></span>`,
      );
      chip.type = "button";
      chip.setAttribute("aria-label", t("nav.account"));
      chip.addEventListener("click", () => this.openMore());
      end.appendChild(chip);
    } else {
      const signIn = el("button", "btn btn--secondary btn--sm", `${icon("logIn", { size: "sm", className: "icon--dir" })}<span>${t("nav.signIn")}</span>`);
      signIn.type = "button";
      signIn.addEventListener("click", () => this.actions.onSignIn());
      end.appendChild(signIn);
    }
    inner.appendChild(end);

    this.topbar.replaceChildren(inner);
  }

  private renderTabbar() {
    this.tabbar.replaceChildren(
      ...TABS.map((tab) => {
        const btn = el("button", "tabbar__btn", `${icon(tab.icon)}<span>${t(tab.labelKey)}</span>`);
        btn.type = "button";
        if (this.active === tab.id) btn.setAttribute("aria-current", "page");
        btn.addEventListener("click", () => this.select(tab.id));
        return btn;
      }),
    );
  }

  private select(tab: TabId) {
    if (tab === "more") {
      this.openMore();
      return;
    }
    this.closeMore();
    this.actions.onTab(tab);
  }

  // ---------------------------------------------------------------- More sheet

  openMore() {
    if (this.sheet) return;
    const overlay = el("div", "sheet-overlay");
    const sheet = el("div", "sheet more-sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", t("nav.more"));
    overlay.appendChild(sheet);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeMore();
    });
    document.addEventListener("keydown", this.onKey);

    if (this.user) {
      const account = el(
        "div",
        "menu-account",
        `${avatarHTML(this.user.displayName ?? this.user.email, this.user.photoURL, "avatar--lg")}
         <div class="list-row__main">
           <span class="menu-account__name" dir="auto">${esc(this.user.displayName ?? this.user.email ?? "")}</span>
           <span class="list-row__meta">${t("home.myScore")}: <span class="num">${this.score ?? "–"}</span></span>
         </div>`,
      );
      sheet.appendChild(account);
    }

    const go = (fn: () => void) => () => {
      this.closeMore();
      fn();
    };

    const main: [IconName, string, () => void][] = [
      ["help", t("home.menu.scoringInfo"), go(this.actions.onOpenScoringInfo)],
      ["headphones", t("home.menu.timeKiller"), go(this.actions.onOpenTimeKiller)],
      ["compass", t("home.menu.sportsWorld"), go(this.actions.onOpenSportsHub)],
    ];
    if (this.user) main.push(["plus", t("home.menu.createLeague"), go(this.actions.onCreateLeague)]);
    if (this.user && CHALLENGE_FEATURE_ENABLED)
      main.push(["zap", t("home.menu.myChallenges"), go(this.actions.onOpenMyChallenges)]);
    if (isAdmin(this.user)) main.push(["sliders", t("home.menu.admin"), go(this.actions.onOpenAdmin)]);
    sheet.appendChild(this.menuList(main));

    // Language
    const langGroup = el("div", "menu-group");
    langGroup.appendChild(el("p", "overline menu-group__title", t("nav.language")));
    const seg = el("div", "segmented");
    seg.setAttribute("role", "group");
    const langs: [Lang, string][] = [
      ["he", t("lang.he")],
      ["en", t("lang.en")],
    ];
    langs.forEach(([lang, label]) => {
      const b = el("button", "segmented__btn");
      b.type = "button";
      b.lang = lang;
      b.textContent = label;
      b.setAttribute("aria-pressed", String(getLang() === lang));
      b.addEventListener("click", () => {
        if (getLang() !== lang) setLang(lang);
      });
      seg.appendChild(b);
    });
    langGroup.appendChild(seg);
    sheet.appendChild(langGroup);

    // App + community
    const extra: [IconName, string, () => void][] = [];
    if (!isRunningStandalone()) extra.push(["download", t("home.install"), go(this.actions.onInstall)]);
    const extraGroup = el("div", "menu-group");
    const list = this.menuList(extra);
    const wa = el(
      "a",
      "list-row",
      `<span class="list-row__icon wa-icon">${icon("whatsapp")}</span>
       <span class="list-row__main"><span class="list-row__title">${t("home.whatsappGroup.title")}</span></span>
       ${icon("external", { size: "sm", className: "c-3" })}`,
    );
    wa.href = WHATSAPP_GROUP_URL;
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    list.appendChild(wa);
    extraGroup.appendChild(list);
    sheet.appendChild(extraGroup);

    if (this.user) {
      const out = el("button", "btn btn--ghost btn--block menu-signout", `${icon("logOut", { className: "icon--dir" })}<span>${t("home.signOut")}</span>`);
      out.type = "button";
      out.addEventListener("click", () => {
        this.closeMore();
        signOutUser();
      });
      const g = el("div", "menu-group");
      g.appendChild(out);
      sheet.appendChild(g);
    }

    const links = el("div", "menu-footer-links");
    const about = el("button", "link-btn", t("home.about"));
    about.addEventListener("click", go(this.actions.onOpenAbout));
    const privacy = el("button", "link-btn", t("home.privacy"));
    privacy.addEventListener("click", go(this.actions.onOpenPrivacy));
    links.append(about, privacy);
    sheet.appendChild(links);

    document.body.appendChild(overlay);
    this.sheet = overlay;
    (sheet.querySelector("button, a") as HTMLElement | null)?.focus({ preventScroll: true });
  }

  closeMore() {
    this.sheet?.remove();
    this.sheet = null;
    document.removeEventListener("keydown", this.onKey);
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.closeMore();
  };

  private menuList(items: [IconName, string, () => void][]): HTMLElement {
    const list = el("div", "list");
    items.forEach(([ic, label, fn]) => {
      const row = el(
        "button",
        "list-row",
        `<span class="list-row__icon">${icon(ic)}</span>
         <span class="list-row__main"><span class="list-row__title"></span></span>
         ${icon("chevronForward", { size: "sm", className: "c-3" })}`,
      );
      row.type = "button";
      row.querySelector(".list-row__title")!.textContent = label;
      row.addEventListener("click", fn);
      list.appendChild(row);
    });
    return list;
  }
}
