import type { Player } from "../prediction/types";
import {
  submitGameResult,
  getPredictionCounts,
  getLinkEventStats,
  getAdminChallenges,
  resolveChallenge,
  cancelChallenge,
  setGameBonusQuestion,
  addGameVideo,
  deleteGameVideo,
  type LinkEventStat,
  type Challenge,
} from "../api/backend";
import type { ScheduleGame } from "../schedule/schedule";
import { getBonusQuestion, setBonusQuestion } from "../schedule/schedule";
import { TEAMS, HAPOEL_JERUSALEM_TEAM_ID, teamName } from "../schedule/teams";
import { adminClipsForGame, setAdminClips, type VideoClip } from "../config/videos";
import { t } from "../i18n/i18n";
import { screenHeader } from "../ui/ScreenHeader";

/**
 * Admin-only screen: enter the *actual* outcome for a game (which foreign
 * players played, who led in each stat category and by how much, and the
 * final score), save it, then grade every submitted prediction for that game.
 */
export class AdminScreen {
  private container: HTMLElement;
  private games: ScheduleGame[];
  private players: Player[];
  private onBack: () => void;

  private gameId: string | null = null;
  private topScorerPlayerId: string | null = null;
  private topScorerPoints: number | null = null;
  private topRebounderPlayerId: string | null = null;
  private topRebounds: number | null = null;
  private topAssistPlayerId: string | null = null;
  private topAssists: number | null = null;
  private homeScore: number | null = null;
  private awayScore: number | null = null;
  private teamThrees: number | null = null;
  private teamRebounds: number | null = null;
  private teamAssists: number | null = null;
  private bonusAnswer: boolean | null = null;
  private bonusQuestionDraft: string | null = null;
  private bonusStatus = "";
  private videoTitleDraft = "";
  private videoLinkDraft = "";
  private videoDurationDraft = "";
  private videoStatus = "";
  private statusMessage = "";
  private predictionCounts: Record<string, number> = {};
  private linkEventStats: LinkEventStat[] = [];
  private challenges: Challenge[] = [];
  private challengeFilterGameId: string | null = null;
  private challengeShowClosed = false;
  private saveBtn: HTMLButtonElement | null = null;

  constructor(
    container: HTMLElement,
    games: ScheduleGame[],
    onBack: () => void,
    players: Player[] = [],
  ) {
    this.container = container;
    this.games = games;
    this.players = players;
    this.onBack = onBack;
  }

  setPlayers(players: Player[]) {
    this.players = players;
  }

  private get selectedGame(): ScheduleGame | null {
    return this.games.find((g) => g.id === this.gameId) ?? null;
  }

  show() {
    this.container.classList.remove("hidden");
    this.render();
    getPredictionCounts()
      .then((counts) => {
        this.predictionCounts = counts;
        this.render();
      })
      .catch((err) => console.warn("Could not load prediction counts:", err));
    getLinkEventStats()
      .then((stats) => {
        this.linkEventStats = stats;
        this.render();
      })
      .catch((err) => console.warn("Could not load link event stats:", err));
    this.refreshChallenges();
  }

  private refreshChallenges() {
    getAdminChallenges()
      .then((challenges) => {
        this.challenges = challenges;
        this.render();
      })
      .catch((err) => console.warn("Could not load challenges:", err));
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private render() {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "screen admin";

    const header = screenHeader({ title: t("admin.title"), onBack: () => this.onBack() });
    wrapper.appendChild(header);

    wrapper.appendChild(this.renderLinkStats());
    wrapper.appendChild(this.renderChallenges());
    wrapper.appendChild(this.renderGameSelect());

    if (this.gameId) {
      wrapper.appendChild(this.renderBonusQuestionSetup());
      wrapper.appendChild(this.renderVideosSetup());
      wrapper.appendChild(this.renderStatsForm());
      wrapper.appendChild(this.renderTeamStatsForm());
      wrapper.appendChild(this.renderScoreForm());
      wrapper.appendChild(this.renderSaveButton());
    }

    if (this.statusMessage) {
      const status = document.createElement("p");
      status.className = "counter-text";
      status.textContent = this.statusMessage;
      wrapper.appendChild(status);
    }

    this.container.appendChild(wrapper);
  }

  /** Admin-only: aggregated click/visit counts per tagged link (shared game links + sponsor CTAs), grouped by source. */
  private renderLinkStats(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    const heading = document.createElement("p");
    heading.className = "counter-text";
    heading.textContent = t("admin.linkStats.title");
    section.appendChild(heading);

    if (this.linkEventStats.length === 0) {
      const empty = document.createElement("p");
      empty.className = "counter-text";
      empty.textContent = t("admin.linkStats.empty");
      section.appendChild(empty);
      return section;
    }

    const table = document.createElement("table");
    table.className = "link-stats-table";
    table.innerHTML = `
      <thead>
        <tr><th>${t("admin.linkStats.link")}</th><th>${t("admin.linkStats.source")}</th><th>${t("admin.linkStats.count")}</th><th>${t("admin.linkStats.last")}</th></tr>
      </thead>
      <tbody>
        ${this.linkEventStats
          .map(
            (row) => `
          <tr>
            <td dir="auto">${row.link_key}</td>
            <td dir="auto">${row.source}</td>
            <td>${row.count}</td>
            <td>${new Date(row.last_at).toLocaleString("he-IL")}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    `;
    section.appendChild(table);
    return section;
  }

  /** Admin-only: friend-challenge side bets awaiting resolution (or cancellation if the question turns out unfair). Must pick a game first - keeps things organized once many games have challenges. */
  private renderChallenges(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    const heading = document.createElement("p");
    heading.className = "counter-text";
    heading.textContent = t("admin.challenges.title");
    section.appendChild(heading);

    if (this.challenges.length === 0) {
      const empty = document.createElement("p");
      empty.className = "counter-text";
      empty.textContent = t("admin.challenges.empty");
      section.appendChild(empty);
      return section;
    }

    const gameIds = Array.from(new Set(this.challenges.map((c) => c.gameId)));
    const gameSelect = document.createElement("select");
    gameSelect.className = "admin-game-select";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = t("admin.selectPlaceholder");
    gameSelect.appendChild(emptyOpt);
    gameIds.forEach((gameId) => {
      const game = this.games.find((g) => g.id === gameId);
      const count = this.challenges.filter((c) => c.gameId === gameId).length;
      const opt = document.createElement("option");
      opt.value = gameId;
      if (game) {
        const opponentId =
          game.homeTeamId === HAPOEL_JERUSALEM_TEAM_ID
            ? game.awayTeamId
            : game.homeTeamId;
        const opponent = TEAMS[opponentId];
        opt.textContent = t("admin.challenges.gameOption", {
          date: game.date,
          opponent: teamName(opponent),
          count,
        });
      } else {
        opt.textContent = `${gameId} (${count})`;
      }
      if (gameId === this.challengeFilterGameId) opt.selected = true;
      gameSelect.appendChild(opt);
    });
    gameSelect.addEventListener("change", () => {
      this.challengeFilterGameId = gameSelect.value || null;
      this.render();
    });
    section.appendChild(gameSelect);

    if (!this.challengeFilterGameId) {
      const prompt = document.createElement("p");
      prompt.className = "counter-text";
      prompt.textContent = t("admin.challenges.selectGamePrompt");
      section.appendChild(prompt);
      return section;
    }

    const showClosedLabel = document.createElement("label");
    showClosedLabel.className = "challenge-show-closed-label";
    const showClosedCheckbox = document.createElement("input");
    showClosedCheckbox.type = "checkbox";
    showClosedCheckbox.checked = this.challengeShowClosed;
    showClosedCheckbox.addEventListener("change", () => {
      this.challengeShowClosed = showClosedCheckbox.checked;
      this.render();
    });
    showClosedLabel.appendChild(showClosedCheckbox);
    showClosedLabel.appendChild(
      document.createTextNode(t("admin.challenges.showClosed")),
    );
    section.appendChild(showClosedLabel);

    const filtered = this.challenges.filter((c) => {
      if (c.gameId !== this.challengeFilterGameId) return false;
      if (this.challengeShowClosed) return true;
      return c.status === "pending" || c.status === "active";
    });

    if (filtered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "counter-text";
      empty.textContent = t("admin.challenges.noneForGame");
      section.appendChild(empty);
      return section;
    }

    const list = document.createElement("div");
    list.className = "challenge-admin-list";

    const filterGame = this.games.find(
      (g) => g.id === this.challengeFilterGameId,
    );
    const mainResultEntered = !!filterGame?.result;

    filtered.forEach((c) => {
      const card = document.createElement("div");
      card.className = "challenge-admin-card";

      const statusLabel: Record<Challenge["status"], string> = {
        pending: t("admin.challenges.statusPending"),
        active: t("admin.challenges.statusActive"),
        resolved: t("admin.challenges.statusResolved"),
        cancelled: t("admin.challenges.statusCancelled"),
      };

      const validationColor: Record<string, string> = {
        APPROVED: "var(--success)",
        NEEDS_CLARIFICATION: "var(--warning)",
        INSUFFICIENT_DATA: "var(--warning)",
        REJECTED: "var(--danger)",
      };
      const dotColor = c.validationStatus
        ? (validationColor[c.validationStatus] ?? "var(--text-3)")
        : "var(--text-3)";
      const dotTitle = c.validationStatus
        ? `${c.validationStatus}${c.validationReasonCode ? ` (${c.validationReasonCode})` : ""}${c.validationExplanation ? `\n${c.validationExplanation}` : ""}`
        : t("admin.challenges.notValidated");

      card.innerHTML = `
        <div class="challenge-admin-meta">
          <span class="challenge-validation-dot" style="background:${dotColor}" title="${dotTitle.replace(/"/g, "&quot;")}"></span>
          #${c.id} &middot; ${t("admin.challenges.game")} ${c.gameId} &middot; ${statusLabel[c.status]}
        </div>
        <p class="bonus-question-text" dir="auto">${c.question}</p>
        <p dir="auto">${c.creatorName}: <strong>${c.creatorAnswer ? t("common.yes") : t("common.no")}</strong> &nbsp;|&nbsp; ${c.opponentName ?? t("admin.challenges.noOpponent")}${c.opponentName ? `: <strong>${c.creatorAnswer ? t("common.no") : t("common.yes")}</strong>` : ""}</p>
      `;

      if (c.status === "resolved") {
        const winnerName =
          c.winnerUid === c.creatorUid ? c.creatorName : c.opponentName;
        const resultLine = document.createElement("p");
        resultLine.dir = "auto";
        resultLine.innerHTML = `${t("admin.challenges.winnerLabel", { name: `<strong>${winnerName}</strong>` })}`;
        card.appendChild(resultLine);
      }

      if (c.status === "cancelled" && c.cancellationReason) {
        const reasonLine = document.createElement("p");
        reasonLine.dir = "auto";
        reasonLine.innerHTML = t("admin.challenges.cancellationReasonLabel", {
          reason: c.cancellationReason,
        });
        card.appendChild(reasonLine);
      }

      if (c.status === "active" && c.opponentUid) {
        if (!mainResultEntered) {
          const locked = document.createElement("p");
          locked.className = "counter-text";
          locked.dir = "auto";
          locked.textContent = t("admin.challenges.resolveLocked");
          card.appendChild(locked);
        } else {
          const question = document.createElement("p");
          question.className = "counter-text";
          question.textContent = t("admin.challenges.resolveQuestion");
          card.appendChild(question);

          const buttons = document.createElement("div");
          buttons.className = "bonus-question-buttons";

          const resolveByActualAnswer = (actualAnswer: boolean) => {
            const winnerUid =
              c.creatorAnswer === actualAnswer ? c.creatorUid : c.opponentUid!;
            resolveChallenge(c.id, winnerUid)
              .then(() => this.refreshChallenges())
              .catch((err) => {
                console.error("Failed to resolve challenge:", err);
                alert(t("admin.challenges.resolveError"));
              });
          };

          const yesBtn = document.createElement("button");
          yesBtn.type = "button";
          yesBtn.className = "btn-secondary bonus-question-choice";
          yesBtn.textContent = t("common.yes");
          yesBtn.addEventListener("click", () => resolveByActualAnswer(true));
          buttons.appendChild(yesBtn);

          const noBtn = document.createElement("button");
          noBtn.type = "button";
          noBtn.className = "btn-secondary bonus-question-choice";
          noBtn.textContent = t("common.no");
          noBtn.addEventListener("click", () => resolveByActualAnswer(false));
          buttons.appendChild(noBtn);

          card.appendChild(buttons);
        }
      }

      if (c.status === "pending" || c.status === "active") {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "btn-secondary challenge-admin-cancel-btn";
        cancelBtn.textContent = t("admin.challenges.cancelBtn");
        cancelBtn.addEventListener("click", () => {
          const reason = prompt(t("admin.challenges.cancelReasonPrompt"));
          if (reason === null) return;
          cancelChallenge(c.id, reason.trim())
            .then(() => this.refreshChallenges())
            .catch((err) => {
              console.error("Failed to cancel challenge:", err);
              alert(t("admin.challenges.cancelError"));
            });
        });
        card.appendChild(cancelBtn);
      }

      list.appendChild(card);
    });

    section.appendChild(list);
    return section;
  }

  private renderGameSelect(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    const label = document.createElement("p");
    label.className = "counter-text";
    label.textContent = t("admin.selectGame");
    section.appendChild(label);

    const select = document.createElement("select");
    select.className = "admin-game-select";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = t("admin.selectPlaceholder");
    select.appendChild(emptyOpt);

    this.games.forEach((g) => {
      const opponentId =
        g.homeTeamId === HAPOEL_JERUSALEM_TEAM_ID ? g.awayTeamId : g.homeTeamId;
      const opponent = TEAMS[opponentId];
      const count = this.predictionCounts[g.id] ?? 0;
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = `${g.date} - ${t("admin.gameOption", { opponent: teamName(opponent), count })}`;
      if (g.id === this.gameId) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      this.gameId = select.value || null;
      this.topScorerPlayerId = null;
      this.topScorerPoints = null;
      this.topRebounderPlayerId = null;
      this.topRebounds = null;
      this.topAssistPlayerId = null;
      this.topAssists = null;
      this.homeScore = null;
      this.awayScore = null;
      this.teamThrees = null;
      this.teamRebounds = null;
      this.teamAssists = null;
      this.bonusAnswer = null;
      this.bonusQuestionDraft = null;
      this.bonusStatus = "";
      this.videoTitleDraft = "";
      this.videoLinkDraft = "";
      this.videoDurationDraft = "";
      this.videoStatus = "";
      this.statusMessage = "";
      this.render();
    });

    section.appendChild(select);

    if (this.gameId) {
      const countLine = document.createElement("p");
      countLine.className = "counter-text";
      countLine.textContent = t("admin.countLine", {
        count: this.predictionCounts[this.gameId] ?? 0,
      });
      section.appendChild(countLine);
    }

    return section;
  }

  /** Lets the admin add/edit/remove the optional yes/no bonus question for the selected game. */
  private renderBonusQuestionSetup(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";
    const gameId = this.gameId!;
    const current = getBonusQuestion(gameId)?.question ?? "";
    if (this.bonusQuestionDraft === null) this.bonusQuestionDraft = current;

    const title = document.createElement("p");
    title.className = "counter-text";
    title.textContent = t("admin.bonusSetup.title");
    section.appendChild(title);

    const hint = document.createElement("p");
    hint.className = "counter-text";
    hint.textContent = t("admin.bonusSetup.hint");
    section.appendChild(hint);

    const input = document.createElement("textarea");
    input.className = "nickname-input";
    input.maxLength = 300;
    input.rows = 2;
    input.dir = "auto";
    input.placeholder = t("admin.bonusSetup.placeholder");
    input.value = this.bonusQuestionDraft;
    input.addEventListener("input", () => {
      this.bonusQuestionDraft = input.value;
    });
    section.appendChild(input);

    const save = async (question: string | null) => {
      try {
        const res = await setGameBonusQuestion(gameId, question);
        setBonusQuestion(gameId, res.question);
        const game = this.games.find((g) => g.id === gameId);
        if (game) game.bonusQuestion = res.question ?? undefined;
        this.bonusQuestionDraft = res.question ?? "";
        this.bonusAnswer = null;
        this.bonusStatus = res.question
          ? t("admin.bonusSetup.saved")
          : t("admin.bonusSetup.removed");
      } catch (err) {
        console.error("Failed to save bonus question:", err);
        this.bonusStatus = t("admin.bonusSetup.failed");
      }
      this.render();
    };

    const buttons = document.createElement("div");
    buttons.className = "prediction-nav";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-secondary";
    removeBtn.textContent = t("admin.bonusSetup.remove");
    removeBtn.disabled = !current;
    removeBtn.addEventListener("click", () => save(null));
    buttons.appendChild(removeBtn);

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn-primary";
    saveBtn.textContent = t("admin.bonusSetup.save");
    saveBtn.addEventListener("click", () =>
      save((this.bonusQuestionDraft ?? "").trim() || null),
    );
    buttons.appendChild(saveBtn);

    section.appendChild(buttons);
    if (this.bonusStatus) {
      const status = document.createElement("p");
      status.className = "counter-text";
      status.textContent = this.bonusStatus;
      section.appendChild(status);
    }
    return section;
  }

  private renderVideosSetup(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";
    const gameId = this.gameId!;

    const title = document.createElement("p");
    title.className = "counter-text";
    title.textContent = t("admin.videos.title");
    section.appendChild(title);

    const hint = document.createElement("p");
    hint.className = "counter-text";
    hint.textContent = t("admin.videos.hint");
    section.appendChild(hint);

    for (const clip of adminClipsForGame(gameId)) {
      const row = document.createElement("div");
      row.className = "prediction-nav";
      const name = document.createElement("p");
      name.className = "counter-text";
      name.dir = "auto";
      name.textContent = clip.title;
      row.appendChild(name);
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-secondary";
      del.textContent = t("admin.videos.remove");
      del.addEventListener("click", async () => {
        if (clip.id === undefined) return;
        try {
          await deleteGameVideo(gameId, clip.id);
          this.updateGameVideos(
            gameId,
            adminClipsForGame(gameId).filter((c) => c.id !== clip.id),
          );
          this.videoStatus = t("admin.videos.removed");
        } catch (err) {
          console.error("Failed to remove video:", err);
          this.videoStatus = t("admin.videos.failed");
        }
        this.render();
      });
      row.appendChild(del);
      section.appendChild(row);
    }

    const makeInput = (
      placeholder: string,
      value: string,
      maxLength: number,
      onInput: (v: string) => void,
      dir = "auto",
    ) => {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "nickname-input";
      input.maxLength = maxLength;
      input.dir = dir;
      input.placeholder = placeholder;
      input.value = value;
      input.addEventListener("input", () => onInput(input.value));
      section.appendChild(input);
    };
    makeInput(t("admin.videos.titlePlaceholder"), this.videoTitleDraft, 200, (v) => {
      this.videoTitleDraft = v;
    });
    makeInput(
      t("admin.videos.linkPlaceholder"),
      this.videoLinkDraft,
      200,
      (v) => {
        this.videoLinkDraft = v;
      },
      "ltr",
    );
    makeInput(
      t("admin.videos.durationPlaceholder"),
      this.videoDurationDraft,
      10,
      (v) => {
        this.videoDurationDraft = v;
      },
      "ltr",
    );

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn-primary";
    addBtn.textContent = t("admin.videos.add");
    addBtn.addEventListener("click", async () => {
      const clipTitle = this.videoTitleDraft.trim();
      const link = this.videoLinkDraft.trim();
      if (!clipTitle || !link) {
        this.videoStatus = t("admin.videos.missing");
        this.render();
        return;
      }
      addBtn.disabled = true;
      try {
        const created = await addGameVideo(gameId, {
          title: clipTitle,
          youtube: link,
          duration: this.videoDurationDraft.trim() || undefined,
        });
        this.updateGameVideos(gameId, [...adminClipsForGame(gameId), created]);
        this.videoTitleDraft = "";
        this.videoLinkDraft = "";
        this.videoDurationDraft = "";
        this.videoStatus = t("admin.videos.added");
      } catch (err) {
        console.error("Failed to add video:", err);
        this.videoStatus = t("admin.videos.failed");
      }
      this.render();
    });
    section.appendChild(addBtn);

    if (this.videoStatus) {
      const status = document.createElement("p");
      status.className = "counter-text";
      status.textContent = this.videoStatus;
      section.appendChild(status);
    }
    return section;
  }

  private updateGameVideos(
    gameId: string,
    clips: VideoClip[],
  ): void {
    setAdminClips(gameId, clips);
    const game = this.games.find((g) => g.id === gameId);
    if (game) game.videos = clips.length ? clips : undefined;
  }

  private renderStatsForm(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    const counter = document.createElement("p");
    counter.className = "counter-text";
    counter.textContent = t("admin.statsQuestion");
    section.appendChild(counter);

    const list = document.createElement("div");
    list.className = "stat-form-list";

    const rows: {
      label: string;
      playerId:
        | "topScorerPlayerId"
        | "topRebounderPlayerId"
        | "topAssistPlayerId";
      amount: "topScorerPoints" | "topRebounds" | "topAssists";
      amountLabel: string;
    }[] = [
      {
        label: t("prediction.category.scorer"),
        playerId: "topScorerPlayerId",
        amount: "topScorerPoints",
        amountLabel: t("prediction.category.scorer.amount"),
      },
      {
        label: t("prediction.category.rebounder"),
        playerId: "topRebounderPlayerId",
        amount: "topRebounds",
        amountLabel: t("prediction.category.rebounder.amount"),
      },
      {
        label: t("prediction.category.assist"),
        playerId: "topAssistPlayerId",
        amount: "topAssists",
        amountLabel: t("prediction.category.assist.amount"),
      },
    ];

    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "stat-form-row";

      const nameEl = document.createElement("div");
      nameEl.className = "stat-form-name";
      nameEl.textContent = row.label;
      rowEl.appendChild(nameEl);

      const inputs = document.createElement("div");
      inputs.className = "stat-form-inputs";

      const selectField = document.createElement("label");
      selectField.className = "stat-field";
      selectField.innerHTML = `<span>${t("admin.player")}</span>`;
      const select = document.createElement("select");
      select.className = "admin-game-select";
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = t("admin.selectPlaceholder");
      select.appendChild(emptyOpt);
      this.players.forEach((player) => {
        const opt = document.createElement("option");
        opt.value = player.id;
        opt.textContent = `#${player.jerseyNumber} ${player.name}`;
        if (this[row.playerId] === player.id) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener("change", () => {
        this[row.playerId] = select.value || null;
      });
      selectField.appendChild(select);
      inputs.appendChild(selectField);

      const amountField = document.createElement("label");
      amountField.className = "stat-field";
      amountField.innerHTML = `<span>${row.amountLabel}</span>`;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.value = this[row.amount] === null ? "" : String(this[row.amount]);
      input.addEventListener("input", () => {
        const parsed = Number(input.value);
        this[row.amount] =
          input.value !== "" && Number.isFinite(parsed) && parsed >= 0
            ? parsed
            : null;
      });
      amountField.appendChild(input);
      inputs.appendChild(amountField);

      rowEl.appendChild(inputs);
      list.appendChild(rowEl);
    });

    section.appendChild(list);
    return section;
  }

  private renderTeamStatsForm(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    const counter = document.createElement("p");
    counter.className = "counter-text";
    counter.textContent = t("admin.teamStatsQuestion");
    section.appendChild(counter);

    const fields: {
      label: string;
      key: "teamThrees" | "teamRebounds" | "teamAssists";
    }[] = [
      { label: t("prediction.teamStep.threes"), key: "teamThrees" },
      { label: t("prediction.teamStep.rebounds"), key: "teamRebounds" },
      { label: t("prediction.teamStep.assists"), key: "teamAssists" },
    ];

    fields.forEach(({ label, key }) => {
      const field = document.createElement("label");
      field.className = "stat-field";
      field.innerHTML = `<span>${label}</span>`;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.value = this[key] === null ? "" : String(this[key]);
      input.addEventListener("input", () => {
        const parsed = Number(input.value);
        this[key] =
          input.value !== "" && Number.isFinite(parsed) && parsed >= 0
            ? parsed
            : null;
      });
      field.appendChild(input);
      section.appendChild(field);
    });

    const bonusQuestion = this.gameId
      ? getBonusQuestion(this.gameId)
      : undefined;
    if (bonusQuestion) {
      const bonusField = document.createElement("div");
      bonusField.className = "bonus-question-field";
      bonusField.innerHTML = `
        <span class="bonus-question-badge">${t("admin.bonusQuestionLabel", { points: bonusQuestion.points })}</span>
        <p class="bonus-question-text" dir="auto">${bonusQuestion.question}</p>
      `;
      const buttons = document.createElement("div");
      buttons.className = "bonus-question-buttons";
      const buildChoice = (label: string, value: boolean) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "btn-secondary bonus-question-choice" +
          (this.bonusAnswer === value ? " selected" : "");
        btn.textContent = label;
        btn.addEventListener("click", () => {
          this.bonusAnswer = value;
          this.render();
        });
        return btn;
      };
      buttons.appendChild(buildChoice(t("common.yes"), true));
      buttons.appendChild(buildChoice(t("common.no"), false));
      bonusField.appendChild(buttons);
      section.appendChild(bonusField);
    }

    return section;
  }

  private renderScoreForm(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    const counter = document.createElement("p");
    counter.className = "counter-text";
    counter.textContent = t("admin.scoreQuestion");
    section.appendChild(counter);

    const game = this.selectedGame;
    const home = game ? TEAMS[game.homeTeamId] : null;
    const away = game ? TEAMS[game.awayTeamId] : null;

    const row = document.createElement("div");
    row.className = "stat-form-row";
    const inputs = document.createElement("div");
    inputs.className = "stat-form-inputs";

    const homeField = document.createElement("label");
    homeField.className = "stat-field";
    homeField.innerHTML = `<span dir="auto">${home?.name ?? t("admin.home")}</span>`;
    const homeInput = document.createElement("input");
    homeInput.type = "number";
    homeInput.min = "0";
    homeInput.value = this.homeScore === null ? "" : String(this.homeScore);
    homeInput.addEventListener("input", () => {
      const parsed = Number(homeInput.value);
      this.homeScore =
        homeInput.value !== "" && Number.isFinite(parsed) && parsed >= 0
          ? parsed
          : null;
      this.refreshSaveButtonState();
    });
    homeField.appendChild(homeInput);
    inputs.appendChild(homeField);

    const awayField = document.createElement("label");
    awayField.className = "stat-field";
    awayField.innerHTML = `<span dir="auto">${away?.name ?? t("admin.away")}</span>`;
    const awayInput = document.createElement("input");
    awayInput.type = "number";
    awayInput.min = "0";
    awayInput.value = this.awayScore === null ? "" : String(this.awayScore);
    awayInput.addEventListener("input", () => {
      const parsed = Number(awayInput.value);
      this.awayScore =
        awayInput.value !== "" && Number.isFinite(parsed) && parsed >= 0
          ? parsed
          : null;
      this.refreshSaveButtonState();
    });
    awayField.appendChild(awayInput);
    inputs.appendChild(awayField);

    row.appendChild(inputs);
    section.appendChild(row);
    return section;
  }

  private renderSaveButton(): HTMLElement {
    const section = document.createElement("div");
    section.className = "prediction-section";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-primary";
    btn.textContent = t("admin.saveButton");
    btn.disabled = this.homeScore === null || this.awayScore === null;
    btn.addEventListener("click", () => this.saveAndGrade());
    this.saveBtn = btn;
    section.appendChild(btn);
    return section;
  }

  /** Toggles the save button's disabled state in place, without a full re-render (which would blow away input focus). */
  private refreshSaveButtonState() {
    if (this.saveBtn) {
      this.saveBtn.disabled =
        this.homeScore === null || this.awayScore === null;
    }
  }

  private async saveAndGrade() {
    if (!this.gameId) return;
    this.statusMessage = t("admin.saving");
    this.render();

    try {
      const { graded } = await submitGameResult({
        gameId: this.gameId,
        actualForeignPlayerIds: [],
        actualTopScorerPlayerId: this.topScorerPlayerId,
        actualTopScorerPoints: this.topScorerPoints,
        actualTopRebounderPlayerId: this.topRebounderPlayerId,
        actualTopRebounds: this.topRebounds,
        actualTopAssistPlayerId: this.topAssistPlayerId,
        actualTopAssists: this.topAssists,
        actualHomeScore: this.homeScore,
        actualAwayScore: this.awayScore,
        actualTeamThrees: this.teamThrees,
        actualTeamRebounds: this.teamRebounds,
        actualTeamAssists: this.teamAssists,
        actualBonusAnswer: this.bonusAnswer,
      });

      this.statusMessage = t("admin.saved", { count: graded });
    } catch (err) {
      console.error("Failed to save/grade result:", err);
      this.statusMessage = t("admin.saveFailed");
    }

    this.render();
  }
}
