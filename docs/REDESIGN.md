# Redesign - branch `redesign-glass`

UI-only redesign. No changes to `src/api/`, `src/firebase/`, `firestore.rules`,
`src/prediction/lock.ts`, scoring logic or the sign-in flow.

## What changed
- **Look:** near-black "night glass" theme - frosted translucent panes over a
  soft ambient light, iOS-style materials. All colours are tokens in
  `src/styles/tokens.css`; components in `src/styles/components.css`, screens in
  `src/style.css`. Logical (RTL/LTR) properties only.
- **Type:** CoFo Peshka (Adobe Fonts kit `pdv5cou`, loaded in `index.html`) for
  headlines and big numbers; IBM Plex Sans Hebrew for text and data.
- **Home:** next game as a home/away face-off over a match photo, scores strip,
  "my season", schedule as list or month calendar, leaders with medals.
- **Prediction:** roster player cards (photo, #number, position), required
  amounts with realistic starting values, stat icons, recap with player photos,
  predicted-vs-actual table for finished games, crowd-vs-actual.
- **Leaderboards:** gold/silver/bronze podium and medals.
- **About:** design & photography credits (Omer Mishan, Nadav Mazuman).
- **Motion:** cursor-following light on glass panes, card tilt, page fade-in -
  mouse only, and off under "reduce motion".
- **Accessibility:** axe WCAG 2.1 AA - 0 violations on the main screens (he/en,
  desktop/phone); skip link, main landmark, focus management, AA contrast.

## Adding game videos
Edit `src/config/videos.ts` - add the game's id and its clips (a YouTube link,
or an mp4 in `public/videos/`). The latest finished game shows its clips on
the home page ("Last game"); every finished game shows them on its own page.
YouTube clips load only when tapped (privacy-enhanced embed). Commit + push
and the site updates on the next deploy.

## Before going live
1. **Adobe Fonts:** add the production domain to kit `pdv5cou`, or Peshka
   won't load (the layout falls back to Karantina / Barlow Condensed).
2. **Player photos** (`src/prediction/playerPhotos.ts`) are hotlinked from the
   EuroCup CDN; Lorenzo Brown's is in `public/players/`. Long term, store them
   in `players.photoUrl`. Make sure the club is OK with using them.
3. **Roster data:** jersey numbers and positions come from the `players` table -
   check them against the official roster (Yonatan Keller #30 is missing).
4. **Match photos** in `public/photos/action/` were supplied by the club
   photographer - confirm usage rights.

## Run
```bash
npm install
npm run dev     # local
npm run build   # production build into dist/
```
Opening a pull request runs the Firebase preview-channel workflow
(`.github/workflows/firebase-hosting-pull-request.yml`); merging to `main`
deploys to production.
