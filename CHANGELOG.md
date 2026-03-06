# Changelog

All notable changes to rompmusic-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (Changes since last release will be listed here)

### Changed

- Increment `expo.android.versionCode` from `4` to `5` for production Android build metadata.

## [0.1.8] - 2026-03-06

### Added

- Add Android native playback service initialization and remote-control handlers via `react-native-track-player`.

### Changed

- Route Android queue execution (`play`, `pause`, `seek`, `skip`, `playNext`, `addToQueue`) through native TrackPlayer queue APIs instead of JS timer-driven advancement logic.
- Synchronize Android player UI state from native playback events and foreground re-sync calls.

### Fixed

- Keep Android queued playback running under lock-screen/background conditions by delegating transition handling to the native playback service.
- Remove Android foreground resume catch-up heuristics from the primary playback path to avoid post-unlock extra-skip behavior.
- Patch `react-native-track-player` Kotlin nullability handling so Android release builds compile under Expo SDK 54 / React Native 0.81.

## [0.1.7] - 2026-03-06

### Changed

- Trigger AppState background handling only for true `background` transitions (not `inactive`).
- Restrict early end-of-track promotion heuristics to background playback only.
- Add Android mini-player previous/next buttons on either side of the play/pause control.
- Sort album tracks using metadata with fallback parsing of leading title numbers when track tags are missing.

### Fixed

- Sync Android native-queue index and position from player status when the app becomes active.
- Limit non-native Android resume catch-up to a single next-track advance to avoid multi-track skips after lock-screen stalls.
- Capture Android background playback snapshots from live player time/duration instead of stale store values.
- Avoid truncating foreground track endings by requiring `didJustFinish` for next-track advancement while app is active.
- Skip Android foreground resume catch-up when playback already advanced to a new track while backgrounded.
- Set Android ExoPlayer wake mode to `WAKE_MODE_NETWORK` so queued stream transitions can continue while device is locked.
- Prefer live player duration/status on foreground resume and suppress forced skips while a track is actively playing.
- Retry Android playback startup with transcoded OGG when original-format stream remains stuck at `0:00`.

## [0.1.6] - 2026-03-05

### Changed

- Increment `expo.android.versionCode` from `2` to `3` for production Android build metadata.

### Fixed

- Normalize search queries by trimming and collapsing internal whitespace before sending `/search` requests.

## [0.1.5] - 2026-03-05

### Changed

- Use the effective configured stream format on web playback and keep Safari on original format when OGG is selected.
- Harden Android native queue setup by trying both JSON-string and array `setQueue` payload signatures before falling back.

### Fixed

- Replace the malformed `expo-audio+1.1.1` patch with a valid patch-package diff so native queue bridge methods apply during install.
- Prevent lock-screen metadata and native seek bridge errors from forcing JS-only track advancement in Android album playback.

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

[Unreleased]: https://github.com/151henry151/rompmusic-client/compare/v0.1.8...HEAD
[0.1.8]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.8
[0.1.7]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.7
[0.1.6]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.6
[0.1.5]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.5
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
