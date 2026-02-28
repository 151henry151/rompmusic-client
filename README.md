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

## License

GPL-3.0-or-later. See [LICENSE](../LICENSE) in the umbrella repo.
