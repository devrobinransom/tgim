# Maestro e2e flows — TGIM consumer mobile

Device-level coverage for the citizen-first surfaces (issue
devrobinransom/tgim#10): onboarding, Home/Explore, Report, Promises.

## Prerequisites

- [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro)
  (`curl -Ls https://get.maestro.mobile.dev | bash`)
- An Android emulator / iOS simulator, or a physical device
- The app built for testing — dev client or production build
  (`npx expo run:android` / `npx expo run:ios`), **not** Expo Go. Flows target
  `org.tgim.app`.
- The API is optional: the Report flow passes with or without it (offline
  queue fallback). For the synced path, run the API first (`pnpm --filter @tgim/api dev`).

## Run

```bash
# from apps/mobile
pnpm e2e                          # all flows
maestro test .maestro/flows/onboarding.yaml # single flow
```

## Notes

- Flows use English copy — run against a fresh install or reset app data
  (`launchApp: clearState`) so the default `en` locale applies.
- `onboarding.yaml` degrades gracefully on iOS where the SecureStore keychain
  may survive `clearState`.
- Add `testID`s (tab bar: `tab-*`, report description:
  `report-description-input`) to keep selectors language-independent where
  practical; text selectors are used only for stable, non-localized chrome.
