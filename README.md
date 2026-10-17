# Dewn automatic music catalog starter

This starter adds a catalog endpoint and adapter for the existing Dewn player. It intentionally does **not** pretend Spotify or MusicBrainz metadata is a playable audio stream.

## Files

- `api/catalog.ts` — GET `/api/catalog`
- `api/streaming.ts` — GET `/api/streaming?title=...&artist=...` for Jamendo's API audio results
- `src/lib/musicCatalog.ts` — Spotify metadata search + MusicBrainz fallback + Jamendo lookup
- `public/js/dewn-catalog-adapter.js` — converts API response into the `songs`/`albums` shape expected by Dewn

## Environment variables

Set these in Vercel Project Settings → Environment Variables:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `JAMENDO_CLIENT_ID` (optional; needed for Jamendo stream search)
- `CATALOG_ALLOWED_ORIGIN` (optional; set to your exact production origin)

Spotify app access and endpoint availability depend on Spotify's current developer rules and the access tier granted to your app. Do not expose Spotify secrets in browser JavaScript.

MusicBrainz is an open metadata catalog, not an audio provider. Configure the MusicBrainz User-Agent contact in `src/lib/musicCatalog.ts` to a real contact before deploying. Respect its rate limits; for production, add a cache/database and avoid parallel request bursts.

Jamendo is a separate audio provider. Verify each track's applicable license and Jamendo API terms for your use case. Audio availability is not guaranteed. Do not treat a stream URL as blanket permission to redistribute or download audio.

## Integrating with the current `index.js`

Your current `index.js` immediately runs `lss()` and expects global `songs` and `albums`. The catalog must finish loading before that call. Because the full HTML and the script that declares `songs`/`albums` were not provided, don't blindly redeclare them as `const` or `let`.

1. Add a loading element to your HTML, for example:
   `<div id="catalog-status" role="status">Loading music…</div>`
2. Include scripts in this order:
   ```html
   <script src="/js/dewn-catalog-adapter.js"></script>
   <script src="/js/index.js"></script>
   ```
   The existing static songs/albums script can remain before the adapter if you want a fallback.
3. In `index.js`, replace the immediate startup block:
   ```js
   let cs = Number(localStorage.getItem("cs")) || 0;
   let currentSong = songs[cs];
   let lastIndex = -1;
   ...
   lss();
   ```
   with the bootstrap pattern below. Keep your function declarations and event handlers, but move event-listener registration into `initPlayer()` so they run after `songs` and `albums` are ready. This is required because event handlers use the arrays and elements.

   ```js
   let songs = [];
   let albums = [];
   let cs = 0;
   let currentSong = null;
   let lastIndex = -1;

   async function bootstrapDewn() {
     const status = document.getElementById("catalog-status");
     if (status) status.textContent = "Loading music…";

     try {
       const catalog = await window.DewnCatalog.load();
       songs = catalog.songs;
       albums = catalog.albums;

       if (!songs.length) throw new Error("No catalog tracks returned");

       const saved = Number(localStorage.getItem("cs"));
       cs = Number.isInteger(saved) && saved >= 0 && saved < songs.length ? saved : 0;
       currentSong = songs[cs];

       if (status) status.textContent = "";
       initPlayer(); // Move your existing lss() call and event-listener setup into this function.
     } catch (error) {
       console.error("Dewn catalog failed:", error);
       if (status) status.textContent = "Couldn't load music. Please refresh later.";
     }
   }

   document.addEventListener("DOMContentLoaded", bootstrapDewn);
   ```

   **Important:** if your current data script declares `const songs` or `let songs` at top level, do not redeclare those names. Instead, use different names such as `catalogSongs`/`catalogAlbums` and update the references deliberately, or change the original declaration to the mutable binding used by the bootstrap.

4. In `lss()`, protect against metadata-only songs:
   ```js
   au.removeAttribute("src");
   if (song.music) {
     au.src = song.music;
     au.load();
   } else {
     au.load();
     // Show a “Preview unavailable” status in your UI; do not call au.play().
   }
   ```
5. `getLyrics(song, au.duration)` should only be called when valid audio metadata has loaded. MusicBrainz/Spotify metadata does not guarantee lyrics or audio.
6. Your existing `#lyrics`, progress bar, favorite button, volume controls, and next/previous handlers can remain, but wire them after bootstrap and make next/previous skip tracks whose `music` field is empty if you only want playable tracks.

## Limitations

- This is a starter implementation, not a verified drop-in patch for the whole app: the HTML, current `songs`/`albums` definitions, `getLyrics()`, and deployment config were not supplied.
- Spotify search results are not a guaranteed “popular charts” feed. The seeded queries are only an initial discovery list and may need adjustment.
- MusicBrainz results are metadata-only; Cover Art Archive images may be absent.
- Spotify may restrict API access or certain endpoints for a newly created app. If Spotify metadata cannot be fetched, the endpoint currently returns the MusicBrainz fallback results.
