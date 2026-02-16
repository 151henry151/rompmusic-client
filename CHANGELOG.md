# Changelog

All notable changes to rompmusic-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (Changes since last release will be listed here)

## [0.1.0-beta.2] - 2026-02-16

### Added

- Mini player queue chevron in its own row above the progress bar (centered); tap toggles queue panel. Chevron removed from full-screen player.

### Changed

- Gapless playback: prestart next track at zero volume ~400 ms before end; at ~20 ms before end promote preload and unmute for seamless transition. Reset `prestartedNext` in all code paths (promote, end-of-queue, skip previous, play track, play next).

### Fixed

- Queue / "play next" bug: playing an album then choosing "play next" on another song could show the wrong track playing (second album track) while UI showed the "play next" song. Fixed by clearing preload and preloading the new next track when the queue changes.

[Unreleased]: https://github.com/151henry151/rompmusic-client/compare/v0.1.0-beta.2...HEAD
[0.1.0-beta.2]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.1

## [0.1.0-beta.1] - 2025-02-15

First beta release. Part of RompMusic 0.1.0-beta.1.

### Added

- Expo app for Android, iOS, and web
- Gapless playback support
- Library, search, and player screens
- JWT authentication

