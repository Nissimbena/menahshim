import type { VideoClip } from "../config/videos";
import { t } from "../i18n/i18n";
import { icon } from "./icons";
import { el, esc } from "./dom";

/** "https://youtu.be/ID", ".../watch?v=ID", ".../shorts/ID" or a bare id -> id. */
function youtubeId(value: string): string | null {
  const v = value.trim();
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = v.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

/**
 * Clip strip: the first clip large, the rest as smaller tiles beside or under
 * it. Nothing heavy loads until a clip is played - YouTube clips start as a
 * poster button and swap in the privacy-enhanced embed on tap; file clips use
 * the native player with preload="metadata".
 */
export function videoClips(clips: VideoClip[], opts: { emptyText?: string } = {}): HTMLElement {
  const wrap = el("div", `clips${clips.length > 1 ? " clips--many" : ""}`);
  if (clips.length === 0) {
    wrap.classList.add("clips--empty");
    wrap.innerHTML = `
      <div class="clips__empty">
        <span class="clips__empty-icon">${icon("play")}</span>
        <p>${esc(opts.emptyText ?? t("videos.empty"))}</p>
      </div>`;
    return wrap;
  }
  clips.forEach((clip, i) => wrap.appendChild(clipTile(clip, i === 0)));
  return wrap;
}

function clipTile(clip: VideoClip, lead: boolean): HTMLElement {
  const fig = el("figure", `clip${lead ? " clip--lead" : ""}`);
  const caption = `<figcaption class="clip__title" dir="auto">${esc(clip.title)}</figcaption>`;
  const yt = clip.youtube ? youtubeId(clip.youtube) : null;

  if (yt) {
    const btn = el(
      "button",
      "clip__frame clip__poster",
      `<img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy" />
       <span class="clip__play">${icon("play")}</span>
       ${clip.duration ? `<span class="clip__duration" dir="ltr">${esc(clip.duration)}</span>` : ""}`,
    );
    btn.type = "button";
    btn.setAttribute("aria-label", t("videos.play", { title: clip.title }));
    btn.addEventListener("click", () => {
      const frame = el("div", "clip__frame");
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1`;
      iframe.title = clip.title;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
      btn.replaceWith(frame);
      iframe.focus();
    });
    fig.appendChild(btn);
  } else if (clip.src) {
    const frame = el("div", "clip__frame");
    const video = document.createElement("video");
    video.src = asset(clip.src);
    if (clip.poster) video.poster = asset(clip.poster);
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.setAttribute("aria-label", clip.title);
    frame.appendChild(video);
    fig.appendChild(frame);
  }
  fig.insertAdjacentHTML("beforeend", caption);
  return fig;
}
