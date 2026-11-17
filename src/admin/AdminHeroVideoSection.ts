import { t } from "../i18n/i18n";
import { deleteGameHeroVideo, getGameMedia, setGameVideoCredit, uploadGameVideo } from "../api/backend";
import { getHeroMedia, registerHeroMedia } from "../home/heroVideo";

const MAX_BYTES = 12_000_000; // same limit as the server
const MIME_BY_EXT: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/quicktime" };

function mimeOf(file: File): string | null {
  if (["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) return file.type;
  return MIME_BY_EXT[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? null;
}

/**
 * Admin form: upload a match-day video for the selected game (it replaces the hero photo), set who gets the
 * credit, or remove it. Keeps its own DOM and state so AdminScreen's full re-renders don't lose what was typed.
 */
export class HeroVideoAdminSection {
  readonly root = document.createElement("div");

  private gameId: string | null = null;
  private credit = "";
  private file: File | null = null;
  private status = "";
  private busy = false;

  constructor() {
    this.root.className = "prediction-section sponsor-admin";
  }

  /** Called whenever the admin selects a game (or clears the selection). */
  setGame(gameId: string | null) {
    this.gameId = gameId;
    this.file = null;
    this.status = "";
    this.credit = gameId ? (getHeroMedia(gameId)?.credit ?? "") : "";
    this.render();
  }

  private textInput(value: string, onInput: (v: string) => void): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.maxLength = 100;
    input.addEventListener("input", () => onInput(input.value));
    return input;
  }

  private button(label: string, cls: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = label;
    b.disabled = this.busy;
    b.addEventListener("click", onClick);
    return b;
  }

  private field(label: string, input: HTMLElement): HTMLElement {
    const wrap = document.createElement("label");
    wrap.className = "stat-field";
    const span = document.createElement("span");
    span.textContent = label;
    wrap.append(span, input);
    return wrap;
  }

  render() {
    this.root.innerHTML = "";
    if (!this.gameId) return;
    const current = getHeroMedia(this.gameId);

    const title = document.createElement("p");
    title.className = "counter-text";
    title.textContent = t("admin.video.title");
    this.root.appendChild(title);

    const fields = document.createElement("div");
    fields.className = "sponsor-admin__fields";

    const state = document.createElement("p");
    state.className = "counter-text";
    state.textContent = current ? t("admin.video.current") : t("admin.video.none");
    fields.appendChild(state);

    if (current) {
      const video = document.createElement("video");
      video.className = "sponsor-admin__video";
      video.src = current.videoUrl;
      video.controls = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      fields.appendChild(video);
    }

    const hint = document.createElement("p");
    hint.className = "counter-text";
    hint.textContent = t("admin.video.hint");
    fields.appendChild(hint);

    const file = document.createElement("input");
    file.type = "file";
    file.accept = "video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm";
    file.addEventListener("change", () => {
      this.file = file.files?.[0] ?? null;
    });
    fields.appendChild(this.field(t("admin.video.file"), file));
    fields.appendChild(this.field(t("admin.video.credit"), this.textInput(this.credit, (v) => (this.credit = v))));
    this.root.appendChild(fields);

    const row = document.createElement("div");
    row.className = "sponsor-admin__row";
    row.appendChild(this.button(t("admin.video.upload"), "btn-primary", () => void this.upload()));
    if (current) {
      row.appendChild(this.button(t("admin.video.saveCredit"), "btn-secondary", () => void this.saveCredit()));
      row.appendChild(this.button(t("admin.video.remove"), "btn-secondary", () => void this.remove()));
    }
    this.root.appendChild(row);

    if (this.status) {
      const status = document.createElement("p");
      status.className = "counter-text";
      status.textContent = this.status;
      this.root.appendChild(status);
    }
  }

  private async refresh() {
    registerHeroMedia(await getGameMedia().catch(() => ({})));
  }

  private async run(work: () => Promise<string>) {
    if (this.busy) return;
    this.busy = true;
    this.render();
    try {
      this.status = await work();
    } catch (err) {
      console.error("Game video action failed:", err);
      this.status = t("admin.video.failed");
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async upload() {
    const gameId = this.gameId;
    if (!gameId) return;
    const file = this.file;
    if (!file) {
      this.status = t("admin.video.chooseFirst");
      return this.render();
    }
    const mime = mimeOf(file);
    if (!mime) {
      this.file = null;
      this.status = t("admin.video.badType");
      return this.render();
    }
    if (file.size > MAX_BYTES) {
      this.file = null;
      this.status = t("admin.video.tooBig");
      return this.render();
    }
    this.status = t("admin.video.uploading");
    await this.run(async () => {
      await uploadGameVideo(gameId, file, mime, this.credit);
      await this.refresh();
      this.file = null;
      return t("admin.video.uploaded");
    });
  }

  private async saveCredit() {
    const gameId = this.gameId;
    if (!gameId) return;
    await this.run(async () => {
      await setGameVideoCredit(gameId, this.credit.trim() || null);
      await this.refresh();
      return t("admin.video.creditSaved");
    });
  }

  private async remove() {
    const gameId = this.gameId;
    if (!gameId) return;
    await this.run(async () => {
      await deleteGameHeroVideo(gameId);
      await this.refresh();
      this.credit = "";
      return t("admin.video.removed");
    });
  }
}
