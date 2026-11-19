# Zapp

A TV guide and show browser built on the [TVmaze API](https://www.tvmaze.com/api) — one self-contained HTML file, no build step, no API key, no dependencies at runtime.

Open `zapp.html` in a browser and it works. TVmaze sends `Access-Control-Allow-Origin: *`, so it runs straight from `file://` or any static host.

## Features

**Tonight** — the broadcast schedule for any country and date, grouped by airtime, with a time window (tonight from 18:00, prime time 20:00–23:00, or the whole day). A top-picks block ranks the best-rated programmes in that window as one hero card plus four runners-up. Filter by channel or by shows you follow. Streaming is an opt-in toggle.

**Deep check** — for countries other than the US, sweeps every schedule source TVmaze exposes, including `/schedule/full`, which holds TBA-airtime episodes the country endpoint silently drops. Reports exactly what each source contributed.

**Search** — `/search/shows`, with sort (relevance, rating, newest, A–Z) and genre/channel filters built from the result set.

**Browse** — all 91,242 shows. Opens with lazy 240-per-page loading; "Index everything" walks all 383 index pages (~4 minutes, ~17 MB slimmed) into IndexedDB, after which filtering and sorting cover the whole database. Rendered through a virtual window: ~42 cards in the DOM regardless of list length. The search box here queries the API as well as the local set, so a query always returns something.

**Show detail** — synopsis, genres, rating, network, links out to IMDb and the official site; a season-by-season episode guide with per-episode watched toggles and season progress; cast list.

**My shows** — star anything; next-episode countdowns via `embed[]=nextepisode`, sorted by what airs soonest. Stored in `localStorage`, never leaves the browser. Backup/restore via a JSON list of show IDs.

Plus a light/dark theme, `/` to focus search, Esc to close, and hash routing between views.

## Running it

```
open zapp.html
```

That's it. The footer shows a live count of API calls made versus cache hits.

## Tests

```
npm install
npm test
```

176 assertions run against the real page in jsdom with mocked API responses shaped like the live payloads. Covers both schedule shapes, the four-source merge and de-duplication, filters, virtual scrolling, the watchlist round-trip through `localStorage`, episode watched-state, the theme toggle, and storage migration.

## Notes on the TVmaze API

Measured 18–19 November 2026, not from documentation:

- **Search is hard-capped at 10 results.** Every query returns at most 10, and `&page=` changes nothing. The database holds 91,242 shows, so search alone can never reach most of it — hence the Browse index.
- **`/shows?page=N` is the real index**: 383 pages of 240, ~1,557 bytes per show (~135 MB in full). Slimmed to the fields a list needs, it's ~194 bytes per show (~17 MB).
- **`/schedule?country=X` silently drops episodes with no announced airtime.** On 18 Nov it omitted 11 US entries that `/schedule/full` had, including *Jeopardy!*, *Wheel of Fortune* and *Tamron Hall*.
- **Coverage is overwhelmingly US/UK.** That day: US 95 listings across 30 networks, GB 26, AU 19, CA 4, DE 2, FR 0. Sampling 1,173 shows found 7 on German networks (0.6%).
- **It is a series database, not an EPG.** No repeats — every listing is a premiere airing. 42% of the US day was news programming; only 10 scripted titles aired. Tagesschau, heute-journal and Wer wird Millionär? aren't in it at all.
- **Streaming lives on separate endpoints.** `/schedule/web?country=` returns global services, `?country=XX` local ones. Streaming releases are timestamped at or near midnight, so they rarely fall inside an evening window.
- **Rate limit** is about 20 calls per 10 seconds per IP. This app throttles to 16 with 4 concurrent and backs off on HTTP 429.

## Implementation notes

- **Transport** splits into `request()` (throttled, uncached) and `get()` (throttled plus a promise cache). The full-index sync uses `request()` — caching 383 pages of full records would pin ~135 MB for nothing.
- **Virtual scrolling** positions cards by `transform` inside an absolutely-positioned window, re-rendered on scroll via `requestAnimationFrame`, with a spacer reserving the full height.
- **Storage**: `localStorage` for the watchlist, watched episodes and theme; IndexedDB for the show index and the ~11 MB full schedule, since `localStorage` caps out around 5 MB. Every access is wrapped — the app degrades to in-memory if storage is unavailable.
- **Show summaries arrive as HTML** and are stripped to text before rendering, so API content can't inject markup.

## Credits

Data by [TVmaze](https://www.tvmaze.com/api), free and without an API key. Poster art is served from TVmaze and remains © its respective rights holders.
