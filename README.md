# RompMusic Client

Cross-platform music client for [RompMusic](https://rompmusic.com). Part of the [RompMusic](https://github.com/151henry151/rompmusic) project.

## Features

- **Android, iOS, and web** — One codebase (Expo / React Native)
- **Gapless playback** — Seamless album playback
- **Play history** — Syncs with server
- **Library, search, player** — Browse and stream from your RompMusic server
- **JWT authentication** — Secure login and registration

## Quick Start

```bash
npm install
npx expo start
```

For web: `npx expo start --web`. For Android/iOS builds: see [EAS Build](https://docs.expo.dev/build/introduction/).

## Configuration

Set the API base URL via `EXPO_PUBLIC_API_URL` (e.g. in `.env`) or in the app’s server settings. Default production: `https://rompmusic.com/api/v1`.

## Android Playback Architecture

Android background/lock-screen playback uses a native playback-service queue architecture.

- Queue execution and transitions run in `react-native-track-player` (native Android service), not JS timers.
- Store actions in `src/store/playerStore.ts` route Android `play/pause/seek/skip/queue` operations to TrackPlayer APIs.
- Native state events (`PlaybackState`, `PlaybackActiveTrackChanged`, `PlaybackProgressUpdated`) synchronize UI state back into the player store.
- The service entrypoint is registered in `index.ts` and implemented in `src/services/androidTrackPlayer.ts`.
- The repository includes `patches/react-native-track-player+4.1.2.patch` for Kotlin nullability compatibility with Expo SDK 54 / React Native 0.81 release builds.

This mirrors the architecture pattern used by large streaming apps: native service owns queue continuity, React UI reflects service state.

## License

GPL-3.0-or-later. See [LICENSE](../LICENSE) in the umbrella repo.
