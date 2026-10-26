/**
 * Game video clips - highlights, interviews, fan moments.
 *
 * To add clips to a game, add an entry keyed by the game's id (the same id
 * the schedule uses, e.g. "26647" or "ec-3"). Each clip is either:
 *   - a YouTube video:  { title: "...", youtube: "https://youtu.be/VIDEO_ID" }
 *   - a video file:     { title: "...", src: "videos/my-clip.mp4", poster: "videos/my-clip.jpg" }
 *     (put the file in /public/videos/ - keep it short and under ~10MB)
 *
 * Clips show only on that game's page (opened from its box score / row once
 * the game is over); the home "Last game" panel shows how many there are.
 *
 * Example:
 *   "26647": [
 *     { title: "תקציר המשחק", youtube: "https://www.youtube.com/watch?v=XXXXXXXXXXX" },
 *     { title: "השלשה של מילטון", src: "videos/milton-three.mp4", poster: "videos/milton-three.jpg" },
 *   ],
 */
export interface VideoClip {
  /** Set for clips added from the admin panel (stored in the database). */
  id?: number;
  title: string;
  /** YouTube link (watch, youtu.be or shorts) or bare video id. */
  youtube?: string;
  /** Path under /public, e.g. "videos/clip.mp4". */
  src?: string;
  /** Poster image for `src` clips, under /public. */
  poster?: string;
  /** Optional length shown on the thumbnail, e.g. "1:24". */
  duration?: string | null;
}

export const GAME_VIDEOS: Record<string, VideoClip[]> = {
  // "26647": [
  //   { title: "תקציר המשחק", youtube: "https://youtu.be/XXXXXXXXXXX" },
  // ],
};

// Clips added by the admin from the admin panel (loaded with the games list).
const adminClips = new Map<string, VideoClip[]>();

export function registerGameVideos(
  games: { id: string; videos?: VideoClip[] }[],
): void {
  adminClips.clear();
  for (const g of games) {
    if (g.videos?.length) adminClips.set(g.id, g.videos);
  }
}

export function setAdminClips(gameId: string, clips: VideoClip[]): void {
  if (clips.length) adminClips.set(gameId, clips);
  else adminClips.delete(gameId);
}

export function adminClipsForGame(gameId: string): VideoClip[] {
  return adminClips.get(gameId) ?? [];
}

export function clipsForGame(gameId: string): VideoClip[] {
  return [...adminClipsForGame(gameId), ...(GAME_VIDEOS[gameId] ?? [])];
}
