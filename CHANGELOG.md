# Changelog

All notable changes to rompmusic-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Restored accidentally removed client code by aligning Android branch sources with the `master` baseline (navigation, stores, server setup flow, history, and related screens/components).
- Restored EAS metadata and preview APK local credentials configuration for reproducible Android builds.
- Server URL normalization now accepts bare host input (e.g. `rompmusic.com`) and normalizes it to `https://.../api/v1`.
- Native first-run setup now requires an explicitly saved server URL; `EXPO_PUBLIC_API_URL` remains a web/default fallback instead of bypassing native onboarding.
- First-run server setup now pre-fills `https://rompmusic.com` and uses shorter helper copy: “Enter your server URL or IP address.”
- Android Library initial album page size is reduced to lower concurrent image-load pressure on first render.
- Albums grid on mobile now renders 4 cards per row.

### Fixed

- Fixed startup bootstrap robustness in `App.tsx` by wiring `AppErrorBoundary` correctly and guarding initialization/restore failures to avoid hard app exits on launch.
- iOS server URL validation now rejects insecure remote `http://` entries (ATS-safe), while still allowing localhost development URLs.
- Fixed native server setup flow getting stuck on the setup screen after tapping Continue by subscribing AppNavigator to reactive server URL state.
- Fixed a release-Android crash path by awaiting session/settings restoration bootstrap calls in `App.tsx` and catching any async restoration failures.
- Removed a native-incompatible `dataSet` prop from the Library screen root container.
- Guarded native artwork rendering against invalid image URIs by falling back to placeholders.
- Fixed invalid `measureLayout` callback usage in Library section measurement that could throw during Android layout.
- Login screen now includes a password visibility toggle.
- Improved mobile login reliability by trying safe username/password normalizations (trim/case/email-local-part variants) when the server reports invalid credentials.

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

[Unreleased]: https://github.com/151henry151/rompmusic-client/compare/v0.1.0-beta.6...HEAD
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

