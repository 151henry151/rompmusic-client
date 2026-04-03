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

## Android local development

This app uses native modules (for example `react-native-track-player`), so **Expo Go is not sufficient** for full Android behavior. Use a **development build** (`expo-dev-client`) and Metro’s **Fast Refresh** for near–real-time updates when you edit TypeScript/React code—no new APK for ordinary UI and JS changes.

### One-time setup

1. **Android Studio** (recommended) or the [Android command-line tools](https://developer.android.com/studio#command-line-tools-only): install **SDK Platform 35** (to match `compileSdkVersion` in `app.json`), **Android SDK Build-Tools**, and an **Android Emulator** system image (**Google APIs** or **Google Play**, **x86_64** on typical Linux/Intel/AMD hosts).
2. **Environment** (adjust paths if your SDK location differs):

   ```bash
   export ANDROID_HOME="$HOME/Android/Sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
   ```

3. **Hardware acceleration**: on Linux, [KVM](https://developer.android.com/studio/run/emulator-acceleration#vm-linux) should be available (`/dev/kvm`). Add your user to the `kvm` group if the emulator is slow or fails to start: `sudo usermod -aG kvm "$USER"` (then log out and back in).
4. **AVD**: create a virtual device in Android Studio’s Device Manager—for example **Pixel 8** or **Pixel 9** with **API 35** (or the closest available). Prefer **x86_64** images on x86_64 hosts for speed.

### First native build (installs the dev client on the emulator/device)

With an emulator running or a device connected (`adb devices`):

```bash
cd rompmusic-client
npm install
npm run android
```

This generates the `android/` project (ignored in git), compiles, and installs the development build.

### Daily workflow (Fast Refresh)

1. Start the emulator (or connect a device).
2. Run:

   ```bash
   npm run start:dev
   ```

3. Open the app on the device/emulator (Expo CLI can launch it; you can also open the installed **RompMusic** dev client manually). Edits to `.tsx`/`.ts` files reload quickly via Fast Refresh.

**When you must rebuild** (`npm run android` again): changes to native code, `app.json` / plugins, new native dependencies, Gradle, or some `patch-package` updates.

### EAS development builds

Alternatively, build a development client in the cloud: [EAS Build development profile](https://docs.expo.dev/develop/development-builds/introduction/) (`development` in `eas.json`), install the APK on a device, then run `npm run start:dev` on your machine so Metro serves the bundle—same Fast Refresh loop without compiling native code locally after that.

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
