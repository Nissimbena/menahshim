import "./heroVideo.css";
import { t } from "../i18n/i18n";

/**
 * Match-day video: replaces the hero photo of one game (with sound once the visitor allows it).
 * PREVIEW - fixed list and shown only on the test host until an admin upload exists, so it stays off in production.
 */
const HERO_VIDEOS: Record<string, string> = { "ec-8": "videos/matchday/ec-8.mp4" };
const PREVIEW_HOSTS = new Set(["hapoel-jerusalem-guess.web.app", "localhost"]);

const ICON_ON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
const ICON_OFF =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';

// One element for the whole session: the hero is re-rendered often, and moving the same node keeps it playing.
let shared: { gameId: string; video: HTMLVideoElement } | null = null;

function sharedVideo(gameId: string, src: string): HTMLVideoElement {
  if (shared?.gameId === gameId) return shared.video;
  const video = document.createElement("video");
  video.className = "photo__video";
  video.src = `${import.meta.env.BASE_URL}${src}`;
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

  shared = { gameId, video };
  return video;
}

/** Puts the game's video over the hero photo (the photo stays underneath as the loading frame). */
export function attachHeroVideo(hero: HTMLElement, gameId: string) {
  const src = HERO_VIDEOS[gameId];
  if (!src || !PREVIEW_HOSTS.has(location.hostname)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const photo = hero.querySelector<HTMLElement>(".hero__photo");
  if (!photo) return;

  const video = sharedVideo(gameId, src);
  photo.appendChild(video);

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
  hero.appendChild(button);
}
