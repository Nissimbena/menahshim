import { t } from "../i18n/i18n";
import { icon } from "./icons";
import { el } from "./dom";

/**
 * Shared header for every inner screen: back arrow (mirrors with dir),
 * an H1, and an optional subtitle. Title/subtitle are set as text, never HTML.
 */
export function screenHeader(opts: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}): HTMLElement {
  const header = el("header", "screen-header");

  if (opts.onBack) {
    const back = el("button", "btn btn--ghost btn--icon screen-header__back", icon("arrowBack", { size: "lg" }));
    back.type = "button";
    back.setAttribute("aria-label", t("common.backBtn"));
    back.addEventListener("click", () => opts.onBack?.());
    header.appendChild(back);
  }

  const titles = el("div", "screen-header__titles");
  const h1 = el("h1", "screen-header__title");
  h1.dir = "auto";
  h1.textContent = opts.title;
  titles.appendChild(h1);
  if (opts.subtitle) {
    const sub = el("p", "screen-header__subtitle");
    sub.dir = "auto";
    sub.textContent = opts.subtitle;
    titles.appendChild(sub);
  }
  header.appendChild(titles);
  return header;
}

/** Skeleton placeholder used instead of "טוען…" text. */
export function skeleton(kind: "list" | "cards" | "text" = "list", count = 5): HTMLElement {
  const wrap = el("div", "skeleton-stack");
  wrap.setAttribute("aria-busy", "true");
  wrap.setAttribute("aria-label", t("common.loading"));
  if (kind === "text") {
    wrap.appendChild(el("span", "skeleton skeleton--title"));
    for (let i = 0; i < count; i++) {
      const line = el("span", "skeleton skeleton--line");
      line.style.width = `${90 - ((i * 17) % 40)}%`;
      wrap.appendChild(line);
    }
    return wrap;
  }
  if (kind === "cards") {
    for (let i = 0; i < count; i++) wrap.appendChild(el("span", "skeleton skeleton--card"));
    return wrap;
  }
  const list = el("div", "list");
  for (let i = 0; i < count; i++) list.appendChild(el("span", "skeleton skeleton--row"));
  wrap.appendChild(list);
  return wrap;
}

/** Centered empty/error state with an icon. */
export function emptyState(text: string, kind: "empty" | "error" = "empty"): HTMLElement {
  const box = el(
    "div",
    `empty-state${kind === "error" ? " empty-state--error" : ""}`,
    `${icon(kind === "error" ? "alert" : "info", { size: "lg" })}<p dir="auto"></p>`,
  );
  box.querySelector("p")!.textContent = text;
  if (kind === "error") box.setAttribute("role", "alert");
  return box;
}
