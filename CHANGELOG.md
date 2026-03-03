# Changelog

All notable changes to rompmusic-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (Changes since last release will be listed here)

## [0.1.4] - 2026-02-14

### Fixed

- "Play album" no longer shows "undefined is not a function" and music plays: guard native-queue path with setQueue availability check and try/catch; fall back to single-track path so playback always works. Native setQueue now accepts a JSON string (avoids List conversion issues in the bridge).

## [0.1.3] - 2026-02-14

### Added

- **Android: native queue** — When playing an album, the app uses ExoPlayer’s native queue (`setMediaItems`). The next track starts when the current one ends even when the device is locked or the app is in the background (no reliance on JS timers or callbacks).

### Fixed

- Playback no longer stops after the first track when the device has been idle or the screen is off; native queue advances in the background.

## [0.1.2] - 2026-02-14

### Fixed

- Album playback: when app returns from background, check actual player position and advance to next track if current track has ended (fixes playback stopping after first track when device was idle/screen off)
- Avoid advancing to next track on every unlock when track was not at end (stricter catch-up: only when remaining ≥ 2s and elapsed ≥ 1s past expected end)
- Unknown/zero duration: use 10‑minute fallback so advance-at-end and 95% fallback still run for streams without duration

## [0.1.1] - 2026-02-14

### Fixed

- Next track now starts when device is locked or screen off: time-based scheduled advance so playback continues in background; catch-up on app resume if timer was delayed
- Album playback: advance to next track reliably at end of track (wider end threshold + fallback timer; fixes playback stopping on e.g. "Full and Away")
- Play album on Android: second track no longer plays first track’s audio (advance by loading next track fresh instead of reusing preloaded player)
- Android release target: set Expo Android build properties to compile/target API 35 so Google Play closed testing accepts new builds

### Added

- expo-audio background playback plugin and WAKE_LOCK for sustained playback when app is in background
- AppState-based background/active handling to advance queue when returning to app after screen-off

## [0.1.0] - 2026-02-14

First stable release. Dropped beta designation for Google Play Store submission.

### Changed

- Version set to 0.1.0 (no longer beta)

## [0.1.0-beta.17] - 2026-03-01

### Fixed

- Album details page not loading (use RefreshControl directly instead of DismissRefreshControl wrapper; safe route.params)
- Random sort keeps 3 albums per row (use same effective grid width as section-index view so card size and column count match)

## [0.1.0-beta.16] - 2026-02-16

### Fixed

- Album details screen black on Android (SwipeDownDismissWrapper layout; outer View + absolute Animated.View so content renders)
- Random sort now keeps 3 albums per row (set albumsPerRow when selecting Random in sort menu)

### Changed

- Full-page player: close control is back arrow top-left (matches album/track detail)
- Swipe-down to dismiss animates (drag page down to reveal previous screen, then dismiss)
- Dismiss gesture no longer shows refresh spinner (DismissRefreshControl with transparent indicator)
- Prefetch first 20 album artwork URLs when library loads for faster grid display

## [0.1.0-beta.15] - 2026-03-16

### Changed

- Swipe-down to dismiss: album detail, track detail, and full-page player now use the same pull-down-at-top gesture as library refresh; pull down at top of scroll to go back or close player (RefreshControl with onRefresh)

## [0.1.0-beta.14] - 2026-03-01

### Added

- EAS Build for Android (APK) with local keystore and credentials, preview profile
- HomeScreen, AppErrorBoundary
- Ngrok tunnel config (.env.ngrok, start-tunnel), build-apk.sh
- expo-asset for Expo SDK 54 compatibility
- Zoomable artwork modal; padded adaptive/icon assets for Android
- expo-audio patch for improved behavior

### Fixed

- App crash on launch: PaperProvider now uses MD3DarkTheme (theme was undefined)
- react-native-screens pinned to ~4.16.0 for Expo SDK 54 (expo-doctor clean)
- Adaptive icon and app icon made square (246×246) for store requirements

### Changed

- Removed ServerSetupScreen, serverStore, HistoryScreen; simplified app entry and navigation
- Player: swipe-down to dismiss, improved media controls and touch tracking
- Album/library/player UI and artwork handling improvements

## [0.1.0-beta.1] - 2025-02-15

First beta release. Part of RompMusic 0.1.0-beta.1.

### Added

- Expo app for Android, iOS, and web
- Gapless playback support
- Library, search, and player screens
- JWT authentication

[Unreleased]: https://github.com/151henry151/rompmusic-client/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.4
[0.1.3]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.3
[0.1.2]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.2
[0.1.1]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.1
[0.1.0]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0
[0.1.0-beta.17]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.17
[0.1.0-beta.16]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.16
[0.1.0-beta.15]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.15
[0.1.0-beta.14]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.14
[0.1.0-beta.1]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.1
