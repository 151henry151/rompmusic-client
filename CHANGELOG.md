# Changelog

All notable changes to rompmusic-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (Changes since last release will be listed here)

## [0.1.4] - 2026-02-14

### Fixed

- Guard native-queue playback with `setQueue` availability checks, fall back to single-track `loadAndPlay`, and pass native queue payloads as JSON strings for bridge compatibility.

## [0.1.3] - 2026-02-14

### Added

- Integrate ExoPlayer native queue (`setMediaItems`) into Android album playback so track sequencing is handled by native player state.

### Fixed

- Route album-end advancement through native queue handling instead of JS-only timing for background/locked playback continuity.

## [0.1.2] - 2026-02-14

### Fixed

- Compare actual player position to expected end on app resume and advance the queue when track end was reached in background.
- Apply stricter resume catch-up guards (`remaining >= 2s` and `elapsed >= 1s` past expected end) before forcing advancement.
- Add a 10-minute fallback duration for unknown/zero-duration streams so end-of-track and 95%-progress fallbacks still execute.

## [0.1.1] - 2026-02-14

### Fixed

- Add time-based scheduled advance and resume catch-up hooks so next-track transitions can run after lock/background intervals.
- Widen end-of-track detection thresholds and add fallback advance timers in album playback flow.
- Advance album queues by loading the next track into a fresh player instance on Android instead of reusing preloaded player state.
- Set Expo Android build properties to compile/target API 35 for Google Play closed-testing requirements.

### Added

- Enable the expo-audio background playback plugin and Android `WAKE_LOCK` support for sustained background playback.
- Add AppState background/active handlers that evaluate queue advancement when returning from screen-off state.

## [0.1.0] - 2026-02-14

First stable release. Dropped beta designation for Google Play Store submission.

### Changed

- Set version to `0.1.0` and drop beta designation.

## [0.1.0-beta.17] - 2026-03-01

### Fixed

- Replace `DismissRefreshControl` usage with direct `RefreshControl` and guard album-detail `route.params` access paths.
- Recalculate random-sort grid width using section-index layout constants to keep three-column album rows.

## [0.1.0-beta.16] - 2026-03-01

### Fixed

- Replace `SwipeDownDismissWrapper` layout with outer `View` plus absolute `Animated.View` composition so album-detail content renders on Android.
- Set `albumsPerRow` explicitly when Random sort is selected to preserve three-column rows.

### Changed

- Replace the full-page player close control with a top-left back arrow to match album/track detail navigation.
- Animate swipe-down dismiss by translating content with drag distance and threshold-based completion.
- Render dismiss refresh control with a transparent indicator to suppress visible spinner artifacts.
- Prefetch the first 20 album artwork URLs when library data loads.

## [0.1.0-beta.15] - 2026-03-01

### Changed

- Add top-of-scroll swipe-down dismiss handlers on album detail, track detail, and full-page player screens.

## [0.1.0-beta.14] - 2026-03-01

### Added

- Add EAS Android APK preview build profile with local keystore/credential support.
- Add `HomeScreen` and `AppErrorBoundary`.
- Add ngrok tunnel configuration (`.env.ngrok`, `start-tunnel`) and `build-apk.sh`.
- Add `expo-asset` compatibility updates for Expo SDK 54.
- Add zoomable artwork modal support and padded adaptive/icon assets for Android.
- Apply expo-audio patch updates.

### Fixed

- Initialize PaperProvider with `MD3DarkTheme` to prevent launch-time theme undefined errors.
- Pin `react-native-screens` to `~4.16.0` for Expo SDK 54 compatibility.
- Replace adaptive and app icon assets with 246x246 square variants for store validation requirements.

### Changed

- Remove `ServerSetupScreen`, `serverStore`, and `HistoryScreen`, and simplify app entry/navigation.
- Update player interactions with swipe-down dismiss handling plus media-control/touch tracking refinements.
- Refine album/library/player UI layout and artwork handling paths.

## [0.1.0-beta.1] - 2025-02-15

First beta release. Part of RompMusic 0.1.0-beta.1.

### Added

- Build Expo app targets for Android, iOS, and web.
- Add gapless playback support.
- Add Library, Search, and Player screens.
- Add JWT authentication.

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
