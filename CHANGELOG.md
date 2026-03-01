# Changelog

All notable changes to rompmusic-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Album grid pinch zoom** — Library album list now supports pinch-to-zoom with a dynamic 1–12 albums-per-row range (default remains 3 on mobile / 5 on larger widths).
- **Zoomable album artwork modal** — Tapping album art on `AlbumDetail` and full-screen `Player` opens a zoom modal with pinch zoom and quick reset.

### Fixed

- **Swipe-down dismiss reliability hardening (Android detail/player)** — Replaced `PanResponder`-based dismiss capture with direct touch-tracking for downward drag distance on `AlbumDetail`, `TrackDetail`, and full-screen `Player`, improving reliability for center-screen swipe-down-to-close gestures.
- **Swipe-down dismiss gesture reliability (Android detail/player)** — `AlbumDetail`, `TrackDetail`, and full-screen `Player` now capture vertical drag intent earlier and trigger dismiss based on tracked max drag distance, so a center-screen ~1 inch downward swipe reliably closes/goes back.
- **Album grid pinch zoom UX (Android/Web)** — Reworked pinch handling to use smooth live gesture scaling with commit-on-release layout updates, eliminating jerky delayed jumps while zooming.
- **Album grid default density + section index spacing** — Restored the default library album density to the previous 3-per-row mobile feel and reserved right-side space so the A–Z section index no longer overlays album covers.
- **Album detail action layout (Android)** — Share button no longer expands incorrectly and pushes track content off-screen on certain albums; action rows now use explicit sizing for single-share vs two-button rows.
- **Swipe-down dismiss on detail screens (Android)** — Improved gesture responder capture on `AlbumDetail` and `TrackDetail` so swipe-down-to-go-back is detected more reliably when starting from scroll position top.
- **Android launcher icon crop** — Added padded Android icon/adaptive foreground assets and wired them in `app.json` to preserve transparent edge padding on devices that mask/crop launcher icons more aggressively.
- **Expo SDK dependency validation** — Pinned `expo-build-properties` back to `~1.0.10` for Expo SDK 54 compatibility so `expo doctor` passes during EAS builds.
- **Deep library album art on Android** — Reduced native eager prefetch pressure in Library and hardened album-art loading retries/resizing so album covers continue loading while scrolling deep into large album lists instead of falling back to placeholders after transient load failures.
- **Grouped album details (multi-artist splits)** — Album detail now auto-discovers related album variants when opened from a single split variant and keeps full tracklists by deduping with title+duration (not disc/track slot only), fixing cases like Doo-Bop showing one track and wrong/no cover in detail view.
- **Swipe-down dismiss reliability (Android)** — `AlbumDetail`, `TrackDetail`, and the full-screen `Player` now use more tolerant swipe-down gesture thresholds and capture handlers directly on scroll containers so drag-to-dismiss consistently returns to the previous view.
- **Android lock-screen/notification controls** — Fixed Now Playing session races when skipping tracks so metadata and controls keep updating after next/previous actions; notification controls now show previous/next track icons instead of seek arrows.

## [0.1.0-beta.13] - 2026-02-28

### Added

- **Account deletion** — Settings → "Delete account" (Account section) with native confirmation; calls `DELETE /auth/me` then clears token and user. Required for App Store compliance.

### Changed

- **Unified mobile branch work** — Combined `cursor/android-app-launch-crash-3dea` and `cursor/ios-app-readiness-edc4` into one client line (startup hardening, server setup flow, login fallback handling, media control updates, Android launch fixes, iOS readiness and EAS metadata).
- **Mobile store readiness** — iOS: `UIBackgroundModes: ["audio"]` and `ITSAppUsesNonExemptEncryption: false` in `app.json`. Android: expo-build-properties with `targetSdkVersion: 34`. App version now synced to `0.1.0-beta.13`.
- **Native deep-link handling** — Navigation linking now includes native prefixes (`rompmusic://`, website URLs) so iOS builds can resolve incoming app/website links to in-app routes.
- **Share URL generation** — Album/track share URLs now use a shared website-base utility (`EXPO_PUBLIC_WEBSITE_URL` fallback) instead of browser-specific fallbacks.
- **Server URL validation on iOS** — Server setup/settings now block insecure `http://` server URLs on iOS with a clear HTTPS requirement message.
- **Server URL normalization** — Entering a bare host (for example `rompmusic.com`) now auto-normalizes to `https://rompmusic.com/api/v1` so self-hosted setup works without requiring users to type the scheme.
- **First-launch native server setup** — Native apps now always require an explicit server URL on first launch; build-time API env defaults are treated as web-only.
- **EAS build metadata** — Linked this client to the existing EAS project ID/owner in `app.json`, and set `cli.appVersionSource` to `local` in `eas.json` so CI/terminal builds do not block on version-source prompts.
- **Server setup copy parity** — First-launch server setup now matches Android wording (`Enter your server URL or IP address.`) with a `https://rompmusic.com` default/placeholder to make onboarding behavior consistent across mobile apps.
- **Server setup continue flow parity** — App navigator now subscribes to `serverUrl` directly so saving a first-run server URL immediately exits setup on native builds.
- **Manual test status** — Android app has been tested and is working; iOS app has not yet been tested.

### Fixed

- **Play history loading** — History screen now requests `/library/tracks/recently-played` without forcing `limit=100`, preventing validation errors and aligning with full-history server behavior.
- **Persisted insecure server URLs on iOS** — Stored `http://` server URLs are now cleared during restore on iOS to avoid silent networking failures from App Transport Security.
- **iOS export compliance prompt** — Added `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` to reduce App Store Connect manual export-compliance setup for standard HTTPS-only client behavior.
- **Startup crash hardening parity** — App startup now awaits/catches `initAudio`, `restoreServerUrl`, `restoreSession`, and `restoreSettings`, and wraps the root app content in `AppErrorBoundary` to prevent native startup crashes from unhandled promise rejections.

## [0.1.0-beta.11] - 2026-02-26

### Changed

- **Album grouping** — `groupAlbumsByArtwork` fallback key is now title + year only (not primary artist + title + year). Multi-artist same release (e.g. "Doo-Bop" with "Miles Davis" and "Miles Davis Feat. Easy Mo Bee") shows as one album in search and library.

## [0.1.0-beta.10] - 2026-02-16

### Fixed

- **Web playback** — Define `clearCurrentPlayerRefs` and `removeStalePlayers` in player store so "Play album" and mini player play work without ReferenceError. Web path clears refs, runs play() in same tick (Safari user gesture), then cleans up stale players in setTimeout(0) to avoid multiple tracks.

## [0.1.0-beta.8] - 2026-02-23

### Added

- **Random album sort** — New Random option in Library album sort; each refresh or pull-to-refresh gives a new random order.
- **Pull-to-refresh on Library** — Swipe down to refresh the list (Artists or Albums tab).

### Changed

- **Search results** — Library search bar and Search screen: album results grouped like Library albums (groupAlbumsByArtwork); one row per group, navigate with albumIds for merged view.
- **Edition suffixes** — (CD), (Vinyl), (LP), (Cassette), (Digital), (Streaming) stripped for “same release” so e.g. Doo-Bop shows as one album. “Play album” guard prevents multiple starts.

## [0.1.0-beta.6] - 2026-02-19

### Added

- **Cookie-based play history when not signed in** — API requests use `credentials: 'include'` so the anonymous play-history cookie is sent and stored. Play history and streaming record/retrieve by cookie when the user is not logged in (public server).
- **Play history icon when logged out** — The clock (play history) icon is shown in the Library header for all users, not only when signed in.
- **Album share** — Share button on the album detail screen (single and multiple editions). Uses native Share on mobile; on web, `navigator.share` or copies album URL to clipboard with in-app “Link copied!” feedback (no reliance on `Alert` on web).
- **Track share in track menu** — “Share” option in the three-dots menu for each track on the album detail screen (same share/copy behavior as album share).
- **Direct album URL** — Opening or refreshing `/app/album/2936` (or `rompmusic.com/album/2936` after redirect) now correctly shows the album detail screen; custom `getStateFromPath` strips the web base path so the router parses the URL.

### Changed

- **No-artwork placeholder** — Placeholder shows subtle “no album art” text (lighter grey, small font) instead of a blank grey square.
- **Multiple editions (grouped albums)** — When an album has multiple editions, the album detail shows an “Editions” section: each edition has its own title, centered “Play album” / “Add to queue” / “Play next” buttons, and its own track list (no merged duplicate list). Single “Play album” at top is only for single-album view.
- **Track list deduplication** — Album detail dedupes tracks by id and by (album_id, disc_number, track_number) so duplicate DB rows or merged editions never show the same track twice.
- **Library first load** — Initial page size reduced from 500 to 80 for artists and albums so the first paint is faster; “Load more” still fetches more.
- **Loading state** — “Loading…” in the mini player stays until playback has actually started (first `playbackStatusUpdate` with loaded/position), not just when the request is sent.
- **Safari playback** — On web, Safari is detected (Apple vendor, not CriOS/FxiOS); Safari requests **original** format instead of OGG because Safari does not support OGG. Playback works on Safari (e.g. MacBook) when files are MP3/M4A/AAC/FLAC.

### Fixed

- Play history empty message no longer says “while signed in”; updated to “Play some tracks to see them here.”

## [0.1.0-beta.5] - 2026-02-18

### Added

- **Album grouping by artwork** — Albums that share the same cover image (identical `artwork_hash` from the server) appear as a single card in the Library. Tapping it opens the album detail with each version (e.g. different discs or editions) listed as separate sections with their full titles.
- **Collaboration and duplicate-title grouping** — When artwork hash is not yet available, albums are grouped by primary artist + normalized title + year so that variants (e.g. "All. Right. Now." by Satsang vs Satsang/G. Love) and same-title albums with different artist credits (e.g. "Amy") merge into one entry. After grouping, groups with the same display title and year are merged (e.g. multi-artist "Amy").
- **Track share** — Share button on the track detail screen: native Share on mobile; on web, uses `navigator.share` or copies the track URL (e.g. `https://rompmusic.com/track/123`) to the clipboard. Track deep links `/track/:id` are supported (website redirects to `/app/track/:id`).

### Changed

- **Albums with no artwork at the bottom** — Albums that show the placeholder (no cover art, or artwork deduplicated) are sorted to the end of the album list. Sorting uses "shows real artwork" (not placeholder) so it applies both globally and within each A–Z letter and decade section. Scroll to the bottom of the Library albums tab to see albums without art.
- Album detail screen shows the actual album title for each version when multiple versions are grouped (e.g. "Blonde On Blonde - Disc 1 (2010 Mono Remaster)") instead of "Disc 1", "Disc 2".

### Fixed

- No-artwork albums (e.g. Iron Maiden "A Matter of Life and Death") no longer appear in alphabetical position; they appear at the end of their letter section and at the end of the list, using both `has_artwork` and `usePlaceholderArtwork` for sort order.

## [0.1.0-beta.3] - 2026-02-17

### Added

- Play history screen (recently played tracks); History in app nav; clock icon in Library when signed in.
- Search suggestions as you type in Library (debounced; tap to open artist/album/track).
- Setting “Put albums with artwork first” in Settings (albums without art at bottom).

### Changed

- Library artists, albums, and songs are paginated (50 per page, “Load more”) to avoid crashes on large libraries.
- Mini player shows album name (artist • album); queue panel shows full queue with current track highlighted; artist and album tappable.
- Artist and album names tappable everywhere (Track detail, Player, Library, Search, Album detail).
- Gapless: prestart next track 15 s before end; seek to 0 on promote; current track streams for faster start.

## [0.1.0-beta.2] - 2026-02-16

### Added

- Mini player queue chevron in its own row above the progress bar (centered); tap toggles queue panel. Chevron removed from full-screen player.

### Changed

- Gapless playback: prestart next track at zero volume ~400 ms before end; at ~20 ms before end promote preload and unmute for seamless transition. Reset `prestartedNext` in all code paths (promote, end-of-queue, skip previous, play track, play next).

### Fixed

- Queue / "play next" bug: playing an album then choosing "play next" on another song could show the wrong track playing (second album track) while UI showed the "play next" song. Fixed by clearing preload and preloading the new next track when the queue changes.

[Unreleased]: https://github.com/151henry151/rompmusic-client/compare/v0.1.0-beta.13...HEAD
[0.1.0-beta.13]: https://github.com/151henry151/rompmusic-client/compare/v0.1.0-beta.11...v0.1.0-beta.13
[0.1.0-beta.6]: https://github.com/151henry151/rompmusic-client/compare/v0.1.0-beta.5...v0.1.0-beta.6
[0.1.0-beta.5]: https://github.com/151henry151/rompmusic-client/compare/v0.1.0-beta.4...v0.1.0-beta.5
[0.1.0-beta.4]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.4
[0.1.0-beta.3]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.3
[0.1.0-beta.2]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.1

## [0.1.0-beta.1] - 2025-02-15

First beta release. Part of RompMusic 0.1.0-beta.1.

### Added

- Expo app for Android, iOS, and web
- Gapless playback support
- Library, search, and player screens
- JWT authentication

po app for Android, iOS, and web
- Gapless playback support
- Library, search, and player screens
- JWT authentication

on

