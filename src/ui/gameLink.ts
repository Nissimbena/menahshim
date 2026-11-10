import { t } from "../i18n/i18n";
import { icon } from "./icons";
import { el } from "./dom";

/** Personal link of one game: the current page plus ?game=<id>. `basePath` overrides the page (e.g. another team's page). */
export function gameUrl(gameId: string, basePath: string = location.pathname): string {
  return `${location.origin}${basePath}?game=${encodeURIComponent(gameId)}`;
}

/** Mirrors the open game into the address bar (so it can be copied), or clears it. */
export function setGameInUrl(gameId: string | null) {
  const url = new URL(location.href);
  if (gameId) url.searchParams.set("game", gameId);
  else if (!url.searchParams.has("game")) return;
  else url.searchParams.delete("game");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}

/**
 * Share button for one game: native share sheet when available, otherwise copies the link.
 * Icon-only by default; `labeled` adds the text for places with room for it.
 */
export function shareGameButton(opts: {
  url: string;
  text: string;
  className?: string;
  labeled?: boolean;
}): HTMLButtonElement {
  const label = t("prediction.share");
  const face = (ic: "share" | "check", text: string) =>
    opts.labeled ? `${icon(ic, { size: "sm" })}<span>${text}</span>` : icon(ic, { size: "lg" });
  const btn = el(
    "button",
    `btn btn--ghost ${opts.labeled ? "btn--sm" : "btn--icon"} game-share ${opts.className ?? ""}`.trim(),
    face("share", label),
  );
  btn.type = "button";
  btn.setAttribute("aria-label", label);
  btn.title = label;

  const reset = () => {
    btn.innerHTML = face("share", label);
    btn.setAttribute("aria-label", label);
    btn.title = label;
  };

  btn.addEventListener("click", async (e) => {
    // Rows and cards around the button are clickable too.
    e.stopPropagation();
    e.preventDefault();
    if (navigator.share) {
      try {
        await navigator.share({ title: t("prediction.header.title"), text: opts.text, url: opts.url });
      } catch {
        // dismissed by the user
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(opts.url);
    } catch {
      window.prompt(label, opts.url);
      return;
    }
    const copied = t("prediction.share.copied");
    btn.innerHTML = face("check", copied);
    btn.setAttribute("aria-label", copied);
    btn.title = copied;
    setTimeout(reset, 1800);
  });
  return btn;
}
