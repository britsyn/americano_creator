# Rally — Americano creator

A mobile-friendly English-language padel tournament organizer. No accounts or backend. Tournament data is stored in the current browser's local storage; clearing browser data removes it.

## Development

Requires Node.js 22+ and Python 3 for the local server. No npm dependencies to install.

```sh
npm test
npm run build
npm run dev
```

Open the local server on port 5173. The static build is in `dist/`.

## Rules

- 4–100 players; any positive court count up to 100. Uses at most `floor(players / 4)` courts.
- Partnerships are generated with the circle method and never repeat in a new tournament. Randomness changes player assignment and some pairings of opposing teams, not the uniqueness guarantee.
- With `4k` or `4k+1` players every possible partnership appears exactly once. For `4k+2`, exactly one partnership is omitted so teams can be grouped into matches. For `4k+3`, each player has two omitted partners, yielding equal total games without repeats.
- Fewer courts split a factor into several rounds; the final round of a factor may use fewer courts. Tournament length is determined by this construction and available courts.
- Total games per player differ by at most one by the end. Round ordering favors players with fewer games, but intermediate game counts and consecutive rest rounds are not guaranteed equal. Repeated opponents are minimized, not prohibited.
- Previously saved tournaments keep their schedule and results; create a new tournament to use the no-repeat rule. Replacements inherit a slot, so uniqueness applies to slots (use a genuinely new player for a replacement).
- Every match awards exactly 20 total points. Enter either team's score; the other is calculated. A 10–10 draw is valid. Clear either score to mark the match unplayed.
- Ranking: individual points, wins, point difference. Equal records share a rank. Rest earns no points; totals are not normalized by games played.
- A replacement inherits the previous player's slot, schedule and all results. This behavior is confirmed before applying.
- PNG export includes matches, names, scores and resting players. Large schedules are split into multiple images; the browser may ask to allow multiple downloads.

## GitHub Pages

Push these files to the `main` branch of `britsyn/americano_creator`. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The included workflow tests, builds and deploys the site on every push to `main`; it can also be run manually from Actions. GitHub Pages must be available for the repository's visibility and plan (public repositories support free Pages).

All app asset paths are relative so the site works under `/americano_creator/`. Google Fonts are optional; system fonts are used if unavailable. No credentials are required by the application. Deployment uses GitHub's built-in workflow token.
