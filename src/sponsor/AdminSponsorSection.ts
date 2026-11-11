import { t } from "../i18n/i18n";
import {
  clearGameSponsorship,
  createSponsor,
  getSponsors,
  getSponsorships,
  setGameSponsorship,
  updateSponsor,
  uploadSponsorAsset,
  type Sponsor,
} from "../api/backend";
import { getSponsorship, registerSponsorships } from "./sponsor";
import { imageFileToDataUrl } from "./image";

type PrizeMode = "keep-last" | "custom";

/**
 * Admin form: mark the selected game as sponsored, pick an existing sponsor (or add a new one with a logo and a
 * link), and set the prize (text + photo) - for a returning sponsor the previous prize is offered and has to be
 * confirmed or replaced. Keeps its own DOM and state so AdminScreen's full re-renders don't lose what was typed.
 */
export class SponsorAdminSection {
  readonly root = document.createElement("div");

  private gameId: string | null = null;
  private sponsors: Sponsor[] = [];
  private on = false;
  private choice = ""; // "" | sponsor id | "new"
  private newName = "";
  private newLink = "";
  private newLogoFile: File | null = null;
  private editing = false; // editing the selected sponsor's own name/link/logo
  private editName = "";
  private editLink = "";
  private editLogoFile: File | null = null;
  private prizeMode: PrizeMode = "custom";
  private prizeText = "";
  private prizeFile: File | null = null;
  private keepAssetId: number | null = null; // current/previous prize photo that is kept unless a new file is chosen
  private keepImageUrl: string | null = null;
  private status = "";
  private busy = false;

  constructor() {
    this.root.className = "prediction-section sponsor-admin";
  }

  /** Called whenever the admin selects a game (or clears the selection). */
  setGame(gameId: string | null) {
    this.gameId = gameId;
    this.reset();
    if (!gameId) return this.render();
    this.loadForGame();
    this.render();
  }

  private reset() {
    this.on = false;
    this.choice = "";
    this.newName = "";
    this.newLink = "";
    this.newLogoFile = null;
    this.editing = false;
    this.editLogoFile = null;
    this.prizeMode = "custom";
    this.prizeText = "";
    this.prizeFile = null;
    this.keepAssetId = null;
    this.keepImageUrl = null;
    this.status = "";
  }

  private applyExisting() {
    const current = this.gameId ? getSponsorship(this.gameId) : undefined;
    if (!current) return;
    this.on = true;
    this.choice = String(current.sponsorId);
    this.prizeMode = "custom";
    this.prizeText = current.prize?.text ?? "";
    this.keepAssetId = current.prize?.assetId ?? null;
    this.keepImageUrl = current.prize?.imageUrl ?? null;
  }

  private loadForGame() {
    const id = this.gameId;
    getSponsors()
      .then((list) => {
        if (this.gameId !== id) return;
        this.sponsors = list;
        this.applyExisting();
        this.render();
      })
      .catch((err) => {
        console.warn("Could not load sponsors:", err);
        this.applyExisting();
        this.status = t("admin.sponsor.loadFailed");
        this.render();
      });
  }

  private selected(): Sponsor | null {
    return this.sponsors.find((s) => String(s.id) === this.choice) ?? null;
  }

  /** Picking a returning sponsor offers its last prize; confirming keeps it, otherwise the admin enters a new one. */
  private onChoiceChange(value: string) {
    this.choice = value;
    this.editing = false;
    this.editLogoFile = null;
    const sponsor = this.selected();
    const isCurrent = this.gameId ? getSponsorship(this.gameId)?.sponsorId === sponsor?.id : false;
    if (sponsor?.lastPrize && !isCurrent) {
      this.prizeMode = "keep-last";
      this.prizeText = "";
      this.prizeFile = null;
      this.keepAssetId = null;
      this.keepImageUrl = null;
    } else if (!isCurrent) {
      this.prizeMode = "custom";
      this.prizeText = "";
      this.keepAssetId = null;
      this.keepImageUrl = null;
    }
    this.render();
  }

  private field(label: string, input: HTMLElement): HTMLElement {
    const wrap = document.createElement("label");
    wrap.className = "stat-field";
    const span = document.createElement("span");
    span.textContent = label;
    wrap.append(span, input);
    return wrap;
  }

  private textInput(value: string, onInput: (v: string) => void, placeholder = "", dir?: string): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.placeholder = placeholder;
    if (dir) input.dir = dir;
    input.addEventListener("input", () => onInput(input.value));
    return input;
  }

  private fileInput(onFile: (f: File | null) => void): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.addEventListener("change", () => onFile(input.files?.[0] ?? null));
    return input;
  }

  private preview(src: string | null, photo = false): HTMLElement | null {
    if (!src) return null;
    const box = document.createElement("div");
    box.className = "sponsor-admin__preview";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    if (photo) img.className = "is-photo";
    box.appendChild(img);
    return box;
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

  render() {
    this.root.innerHTML = "";
    if (!this.gameId) return;

    const title = document.createElement("p");
    title.className = "counter-text";
    title.textContent = t("admin.sponsor.title");
    this.root.appendChild(title);

    const toggle = document.createElement("label");
    toggle.className = "sponsor-admin__toggle";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = this.on;
    box.addEventListener("change", () => {
      this.on = box.checked;
      this.status = "";
      this.render();
    });
    const toggleText = document.createElement("span");
    toggleText.textContent = t("admin.sponsor.toggle");
    toggle.append(box, toggleText);
    this.root.appendChild(toggle);

    const wasSponsored = !!getSponsorship(this.gameId);

    if (this.on) {
      const fields = document.createElement("div");
      fields.className = "sponsor-admin__fields";

      // Sponsor: existing ones first, "new" last.
      const select = document.createElement("select");
      select.className = "admin-game-select";
      const placeholder = new Option(t("admin.sponsor.choose"), "");
      select.appendChild(placeholder);
      this.sponsors.forEach((s) => select.appendChild(new Option(s.name, String(s.id))));
      select.appendChild(new Option(t("admin.sponsor.new"), "new"));
      select.value = this.choice;
      select.addEventListener("change", () => this.onChoiceChange(select.value));
      fields.appendChild(this.field(t("admin.sponsor.sponsor"), select));

      const sponsor = this.selected();
      if (sponsor) {
        const info = this.preview(sponsor.logoUrl);
        if (info) {
          const link = document.createElement("span");
          link.className = "counter-text";
          link.dir = "ltr";
          link.textContent = sponsor.linkUrl;
          info.appendChild(link);
          fields.appendChild(info);
        }
        if (this.editing) {
          fields.appendChild(this.renderEdit(sponsor));
        } else {
          fields.appendChild(this.button(t("admin.sponsor.edit"), "btn-secondary btn--sm", () => this.startEdit(sponsor)));
        }
      }

      if (this.choice === "new") {
        fields.appendChild(this.field(t("admin.sponsor.name"), this.textInput(this.newName, (v) => (this.newName = v))));
        fields.appendChild(
          this.field(t("admin.sponsor.link"), this.textInput(this.newLink, (v) => (this.newLink = v), "https://", "ltr")),
        );
        fields.appendChild(
          this.field(
            t("admin.sponsor.logo"),
            this.fileInput((f) => {
              this.newLogoFile = f;
              this.render();
            }),
          ),
        );
        const logoPreview = this.newLogoFile ? this.preview(URL.createObjectURL(this.newLogoFile)) : null;
        if (logoPreview) fields.appendChild(logoPreview);
      }

      if (this.choice) {
        fields.appendChild(this.renderPrize(sponsor));
      }
      this.root.appendChild(fields);
    }

    const actions = document.createElement("div");
    actions.className = "sponsor-admin__row";
    if (this.on) actions.appendChild(this.button(t("admin.sponsor.save"), "btn-primary", () => void this.save()));
    if (!this.on && wasSponsored) {
      actions.appendChild(this.button(t("admin.sponsor.remove"), "btn-secondary", () => void this.remove()));
    }
    if (actions.children.length) this.root.appendChild(actions);

    if (this.status) {
      const status = document.createElement("p");
      status.className = "counter-text";
      status.textContent = this.status;
      this.root.appendChild(status);
    }
  }

  private renderPrize(sponsor: Sponsor | null): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "sponsor-admin__fields";

    const heading = document.createElement("p");
    heading.className = "counter-text";
    heading.textContent = t("admin.sponsor.prize");
    wrap.appendChild(heading);

    const last = sponsor?.lastPrize ?? null;
    const offerLast = !!last && !(this.gameId && getSponsorship(this.gameId)?.sponsorId === sponsor?.id);

    if (last && offerLast) {
      const radios = document.createElement("div");
      for (const mode of ["keep-last", "custom"] as PrizeMode[]) {
        const row = document.createElement("label");
        row.className = "sponsor-admin__choice";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "sponsor-prize-mode";
        radio.checked = this.prizeMode === mode;
        radio.addEventListener("change", () => {
          this.prizeMode = mode;
          this.render();
        });
        const text = document.createElement("span");
        text.textContent =
          mode === "keep-last"
            ? t("admin.sponsor.prizeSame", { prize: last.text ?? "" })
            : t("admin.sponsor.prizeChange");
        row.append(radio, text);
        radios.appendChild(row);
      }
      wrap.appendChild(radios);
      if (this.prizeMode === "keep-last") {
        const thumb = this.preview(last.imageUrl, true);
        if (thumb) wrap.appendChild(thumb);
        return wrap;
      }
    }

    wrap.appendChild(this.field(t("admin.sponsor.prizeText"), this.textInput(this.prizeText, (v) => (this.prizeText = v))));
    wrap.appendChild(
      this.field(
        t("admin.sponsor.prizeImage"),
        this.fileInput((f) => {
          this.prizeFile = f;
          this.render();
        }),
      ),
    );
    const shown = this.prizeFile ? URL.createObjectURL(this.prizeFile) : this.keepImageUrl;
    const thumb = this.preview(shown, true);
    if (thumb) wrap.appendChild(thumb);
    return wrap;
  }

  private startEdit(sponsor: Sponsor) {
    this.editing = true;
    this.editName = sponsor.name;
    this.editLink = sponsor.linkUrl;
    this.editLogoFile = null;
    this.status = "";
    this.render();
  }

  private renderEdit(sponsor: Sponsor): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "sponsor-admin__fields";

    const note = document.createElement("p");
    note.className = "counter-text";
    note.textContent = t("admin.sponsor.editNote");
    wrap.appendChild(note);

    wrap.appendChild(this.field(t("admin.sponsor.name"), this.textInput(this.editName, (v) => (this.editName = v))));
    wrap.appendChild(
      this.field(t("admin.sponsor.link"), this.textInput(this.editLink, (v) => (this.editLink = v), "https://", "ltr")),
    );
    wrap.appendChild(
      this.field(
        t("admin.sponsor.editLogoKeep"),
        this.fileInput((f) => {
          this.editLogoFile = f;
          this.render();
        }),
      ),
    );
    const logoPreview = this.editLogoFile ? this.preview(URL.createObjectURL(this.editLogoFile)) : null;
    if (logoPreview) wrap.appendChild(logoPreview);

    const row = document.createElement("div");
    row.className = "sponsor-admin__row";
    row.appendChild(this.button(t("admin.sponsor.editSave"), "btn-primary", () => void this.saveEdit(sponsor)));
    row.appendChild(
      this.button(t("admin.sponsor.editCancel"), "btn-secondary", () => {
        this.editing = false;
        this.editLogoFile = null;
        this.render();
      }),
    );
    wrap.appendChild(row);
    return wrap;
  }

  private async saveEdit(sponsor: Sponsor) {
    if (this.busy) return;
    if (!this.editName.trim() || !/^https?:\/\//i.test(this.editLink.trim())) {
      this.status = t("admin.sponsor.editMissing");
      this.render();
      return;
    }
    this.busy = true;
    this.status = t("admin.sponsor.saving");
    this.render();
    try {
      const logoAssetId = this.editLogoFile
        ? await uploadSponsorAsset(await imageFileToDataUrl(this.editLogoFile, 600))
        : undefined;
      await updateSponsor(sponsor.id, { name: this.editName.trim(), linkUrl: this.editLink.trim(), logoAssetId });
      this.sponsors = await getSponsors().catch(() => this.sponsors);
      await this.refreshRegistry();
      this.editing = false;
      this.editLogoFile = null;
      this.status = t("admin.sponsor.editSaved");
    } catch (err) {
      console.error("Could not update sponsor:", err);
      this.status = err instanceof Error && err.message ? err.message : t("admin.sponsor.saveFailed");
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async refreshRegistry() {
    try {
      registerSponsorships(await getSponsorships());
    } catch (err) {
      console.warn("Could not refresh sponsorships:", err);
    }
  }

  private async save() {
    const gameId = this.gameId;
    if (!gameId || this.busy) return;
    this.busy = true;
    this.status = t("admin.sponsor.saving");
    this.render();
    try {
      let sponsorId: number;
      if (this.choice === "new") {
        if (!this.newName.trim() || !this.newLogoFile || !/^https?:\/\//i.test(this.newLink.trim())) {
          throw new Error(t("admin.sponsor.newMissing"));
        }
        const logoAssetId = await uploadSponsorAsset(await imageFileToDataUrl(this.newLogoFile, 600));
        sponsorId = (await createSponsor({ name: this.newName.trim(), linkUrl: this.newLink.trim(), logoAssetId })).id;
      } else if (this.choice) {
        sponsorId = Number(this.choice);
      } else {
        throw new Error(t("admin.sponsor.chooseFirst"));
      }

      const sponsor = this.sponsors.find((s) => s.id === sponsorId) ?? null;
      let prizeText: string | null;
      let prizeAssetId: number | null;
      const offerLast = !!sponsor?.lastPrize && this.prizeMode === "keep-last";
      if (offerLast) {
        prizeText = sponsor!.lastPrize!.text;
        prizeAssetId = sponsor!.lastPrize!.assetId;
      } else {
        prizeText = this.prizeText.trim() || null;
        prizeAssetId = this.prizeFile ? await uploadSponsorAsset(await imageFileToDataUrl(this.prizeFile, 900)) : this.keepAssetId;
      }

      await setGameSponsorship(gameId, { sponsorId, prizeText, prizeAssetId });
      await this.refreshRegistry();
      this.sponsors = await getSponsors().catch(() => this.sponsors);
      this.newName = "";
      this.newLink = "";
      this.newLogoFile = null;
      this.prizeFile = null;
      this.applyExisting();
      this.status = t("admin.sponsor.saved");
    } catch (err) {
      console.error("Could not save sponsorship:", err);
      this.status = err instanceof Error && err.message ? err.message : t("admin.sponsor.saveFailed");
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async remove() {
    const gameId = this.gameId;
    if (!gameId || this.busy) return;
    this.busy = true;
    try {
      await clearGameSponsorship(gameId);
      await this.refreshRegistry();
      this.reset();
      this.status = t("admin.sponsor.removed");
    } catch (err) {
      console.error("Could not remove sponsorship:", err);
      this.status = t("admin.sponsor.saveFailed");
    } finally {
      this.busy = false;
      this.render();
    }
  }
}
