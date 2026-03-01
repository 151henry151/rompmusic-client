# Changelog

All notable changes to rompmusic-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (Changes since last release will be listed here)

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

[Unreleased]: https://github.com/151henry151/rompmusic-client/compare/v0.1.0-beta.15...HEAD
[0.1.0-beta.15]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.15
[0.1.0-beta.14]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.14
[0.1.0-beta.1]: https://github.com/151henry151/rompmusic-client/releases/tag/v0.1.0-beta.1
