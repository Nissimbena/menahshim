/**
 * Game video clips - highlights, interviews, fan moments.
 *
 * To add clips to a game, add an entry keyed by the game's id (the same id
 * the schedule uses, e.g. "26647" or "ec-3"). Each clip is either:
 *   - a YouTube video:  { title: "...", youtube: "https://youtu.be/VIDEO_ID" }
 *   - a video file:     { title: "...", src: "videos/my-clip.mp4", poster: "videos/my-clip.jpg" }
 *     (put the file in /public/videos/ - keep it short and under ~10MB)
 *
 * The home page always shows the clips of the most recent finished game in
 * the "last game" panel, and every finished game shows its own clips.
 *
 * Example:
 *   "26647": [
 *     { title: "תקציר המשחק", youtube: "https://www.youtube.com/watch?v=XXXXXXXXXXX" },
 *     { title: "השלשה של מילטון", src: "videos/milton-three.mp4", poster: "videos/milton-three.jpg" },
 *   ],
 */
export interface VideoClip {
  title: string;
  /** YouTube link (watch, youtu.be or shorts) or bare video id. */
  youtube?: string;
  /** Path under /public, e.g. "videos/clip.mp4". */
  src?: string;
  /** Poster image for `src` clips, under /public. */
  poster?: string;
  /** Optional length shown on the thumbnail, e.g. "1:24". */
  duration?: string;
}

export const GAME_VIDEOS: Record<string, VideoClip[]> = {
  // "26647": [
  //   { title: "תקציר המשחק", youtube: "https://youtu.be/XXXXXXXXXXX" },
  // ],
};

export function clipsForGame(gameId: string): VideoClip[] {
  return GAME_VIDEOS[gameId] ?? [];
}
