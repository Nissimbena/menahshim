import "./heroVideo.css";
import { t } from "../i18n/i18n";
import type { GameMedia } from "../api/backend";

/**
 * Match-day video: replaces the hero photo of a game (with sound once the visitor allows it) and can carry a credit.
 * Uploaded from Admin -> game -> video; games without one keep the photo.
 */
let registry: Record<string, GameMedia> = {};

export function registerHeroMedia(map: Record<string, GameMedia> | null | undefined) {
  registry = map ?? {};
}

export function getHeroMedia(gameId: string): GameMedia | undefined {
  return registry[gameId];
}

const ICON_ON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
const ICON_OFF =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';

// One element for the whole session: the hero is re-rendered often, and moving the same node keeps it playing.
let shared: { key: string; video: HTMLVideoElement } | null = null;

function sharedVideo(gameId: string, url: string): HTMLVideoElement {
  const key = `${gameId}|${url}`; // a re-upload changes the url, so the new file replaces the old element
  if (shared?.key === key) return shared.video;
  shared?.video.pause();
  const video = document.createElement("video");
  video.className = "photo__video";
  video.src = url;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("aria-hidden", "true");

  let started = false;
  const play = () => {
    if (!started) {
      // Sound needs a visitor gesture in most browsers: try with sound, fall back to muted.
      started = true;
      video.muted = false;
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    } else {
      video.play().catch(() => {});
    }
  };
  // Plays only while on screen: a hidden home screen or a detached hero must never keep talking.
  new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !document.hidden) play();
      else video.pause();
    },
    { threshold: 0.25 },
  ).observe(video);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
  });

  shared = { key, video };
  return video;
}

/** Puts the game's video over the hero photo (the photo stays underneath as the loading frame). */
export function attachHeroVideo(hero: HTMLElement, gameId: string) {
  const entry = registry[gameId];
  if (!entry) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const photo = hero.querySelector<HTMLElement>(".hero__photo");
  if (!photo) return;

  const video = sharedVideo(gameId, entry.videoUrl);
  photo.appendChild(video);

  const ui = document.createElement("div");
  ui.className = "hero__video-ui";
  if (entry.credit) {
    const credit = document.createElement("span");
    credit.className = "hero__credit";
    credit.dir = "auto";
    credit.textContent = `${t("hero.video.credit")} ${entry.credit}`;
    ui.appendChild(credit);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "hero__sound";
  const sync = () => {
    button.innerHTML = video.muted ? ICON_OFF : ICON_ON;
    button.setAttribute("aria-label", video.muted ? t("hero.video.soundOn") : t("hero.video.soundOff"));
  };
  sync();
  video.addEventListener("volumechange", sync);
  button.addEventListener("click", () => {
    video.muted = !video.muted;
    if (video.paused) video.play().catch(() => {});
  });
  ui.appendChild(button);
  hero.appendChild(ui);
}
