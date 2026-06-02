# Minimal Uniwind Template

This is a [React Native](https://reactnative.dev/) project built with [Expo](https://expo.dev/) and [React Native Reusables](https://reactnativereusables.com).

It was initialized using the following command:

```bash
npx @react-native-reusables/cli@latest init -t mobile
```

## Getting Started

To run the development server:

```bash
    pnpm dev
```

This will start the Expo Dev Server. Open the app in:

- **iOS**: press `i` to launch in the iOS simulator _(Mac only)_
- **Android**: press `a` to launch in the Android emulator
- **Web**: press `w` to run in a browser

You can also scan the QR code using the [Expo Go](https://expo.dev/go) app on your device. This project fully supports running in Expo Go for quick testing on physical devices.

## Adding components

You can add more reusable components using the CLI:

```bash
npx react-native-reusables/cli@latest add [...components]
```

> e.g. `npx react-native-reusables/cli@latest add input textarea`

If you don't specify any component names, you'll be prompted to select which components to add interactively. Use the `--all` flag to install all available components at once.

## Project Features

- ⚛️ Built with [Expo Router](https://expo.dev/router)
- 🎨 Styled with [Tailwind CSS](https://tailwindcss.com/) via [Uniwind](https://uniwind.dev/)
- 📦 UI powered by [React Native Reusables](https://github.com/founded-labs/react-native-reusables)
- 🚀 New Architecture enabled
- 🔥 Edge to Edge enabled
- 📱 Runs on iOS, Android, and Web

## Learn More

To dive deeper into the technologies used:

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [Uniwind Docs](https://docs.uniwind.dev/)
- [React Native Reusables](https://reactnativereusables.com)

## Populating the Database with Dummy Data

Before populating data, you must have Convex set up and running. From the `packages/backend` directory:

```bash
# First, ensure Convex is configured and running
npx convex dev --once

# Then populate fake data for testing
npx convex run fakeData:populateFakeMuseums
npx convex run fakeData:populateFakeEvents
npx convex run fakeData:populateFakeRatings
```

## Run on your iPhone (USB, no App Store)

Prerequisites: Xcode installed, iPhone unlocked on USB, **Trust This Computer**, **Developer Mode** on (Settings → Privacy & Security → Developer Mode).

From the repo root, in one terminal start Convex:

```bash
cd packages/backend && npx convex dev
```

In another terminal, build and install on the connected phone:

```bash
cd apps/mobile
pnpm ios:device
```

First run may open Xcode signing prompts — use the Apple ID that has access to team **3X5JXMN7S9** (same as EAS). The app bundle id is `sh.edm.museum`.

If the build fails with **No profiles for 'sh.edm.museum'**, open **Xcode → Settings → Accounts**, sign in with an Apple ID on that developer team, then run `pnpm ios:device` again. Or open `ios/Museum.xcworkspace`, select the **Museum** target → **Signing & Capabilities** → enable **Automatically manage signing** and team **3X5JXMN7S9**.

If no device is found, unplug/replug the cable and run `pnpm ios:device` again.

If the build fails with **"iOS X.X is not installed"**, your iPhone’s iOS version is newer than the device support installed in Xcode. Open **Xcode → Settings → Platforms**, download that iOS version, then run `pnpm ios:device` again.

## Push notifications on a physical device

The mention push flow needs a **development build** (not Expo Go), a registered iPhone, and Convex configured.

1. **Register your iPhone** (once per device): from `apps/mobile`, run `pnpm eas:device` and follow the prompts, or use [expo.dev](https://expo.dev) → project → Devices.
2. **Install a dev build**: `pnpm eas:build:dev:ios` (or install the latest with `pnpm eas:install:dev:ios`). Rebuild after native changes to `expo-notifications`.
3. **Convex**: set `EXPO_ACCESS_TOKEN` on your dev deployment — see `packages/backend/README.md`.
4. **Run Metro**: `pnpm dev`, open the dev client on the phone (same Wi‑Fi), sign in, allow notifications. In Metro logs, confirm `[push] Expo push token (device): ExponentPushToken[...]` and a row in the Convex `expoPushTokens` table.
5. **Trigger a push**: from a second account, tag this user on a museum check-in (“Who visited with you?”). Social notifications must be enabled in Profile → Notifications.

## Deploy with EAS

The easiest way to deploy your app is with [Expo Application Services (EAS)](https://expo.dev/eas).

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Updates](https://docs.expo.dev/eas-update/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)

---

If you enjoy using React Native Reusables, please consider giving it a ⭐ on [GitHub](https://github.com/founded-labs/react-native-reusables). Your support means a lot!
