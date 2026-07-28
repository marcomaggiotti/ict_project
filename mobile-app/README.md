# AI Agent Platform - Mobile App

Expo (React Native + TypeScript) app mirroring the web dashboard: upload/manage audio and
image files, manage calendar events/reservations, and a master control panel to
enable/disable/restart each backend service. Every screen has a chat box wired to that
service's `/agent/chat` endpoint.

This folder is self-contained so it can be extracted into its own git repository later with
no code changes. See `/MIGRATION.md` at the repo root for the extraction steps.

## Configuring backend URLs

A mobile binary is installed once and can't have environment variables injected at "container
start" the way the webapp's Docker image can. Two layers:

- `EXPO_PUBLIC_*` vars (see `.env.example`) set the **build-time default**, inlined by Expo.
- The in-app **Settings tab** lets the user point the app at a different deployment at
  runtime; the choice is persisted on-device via `AsyncStorage` and takes precedence.

If you're running the backend microservices via the root `docker-compose.yml` on your own
machine, use your machine's LAN IP instead of `localhost` when testing on a physical device
or a different emulator network namespace (e.g. `http://192.168.1.20:8001`).

## Run locally

```bash
npm install
cp .env.example .env
npx expo start
```

Then open in Expo Go (scan the QR code), an iOS simulator, or an Android emulator.

## Type-check

```bash
npm install
npm run typecheck
```
