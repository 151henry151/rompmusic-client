# Changelog

All notable changes to rompmusic-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (Changes since last release will be listed here)

## [0.1.0-beta.4] - 2026-02-16

### Added

- Favicon from project logo.

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

[Unreleased]: https://github.com/151henry151/rompmusic-client/compare/v0.1.0-beta.4...HEAD
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

