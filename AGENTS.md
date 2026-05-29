# Strmify Agent Instructions

These instructions are for Codex and other agentic coding assistants working in this repository. Treat them as the shared project contract for production-grade development.

This repo uses two focused Codex TOML agent profiles:

- `.codex/agents/development.toml`: use for new features, enhancements, refactors, UI improvements, integrations, and general ongoing development.
- `.codex/agents/bug-fix.toml`: use for crashes, regressions, broken UI, playback defects, bad data handling, and production bug fixes.

MCP server configuration lives in `.codex/config.toml`. Keep this file token-free; put secrets in the user-level Codex config or environment variables.

## Project Snapshot

Strmify is an Expo Router React Native app for iOS, Android, and web. It discovers movies and series through TMDB metadata, resolves streams through Stremio-compatible add-ons, supports direct and torrent streams, integrates OpenSubtitles, and offers multiple playback paths including React Native Video, native players, TorrServer/Stremio service URLs, and a custom iOS KSPlayer bridge.

Primary stack:

- Expo 55, React 19, React Native 0.83, Expo Router typed routes.
- TypeScript with `strict: true` and `@/*` path aliases.
- MMKV-backed local storage through `utils/StorageService.ts`.
- Theme context through `context/ThemeContext.tsx` and shared themed primitives in `components/Themed.tsx`.
- Native iOS player integration through `plugins/withKSPlayer.js` and `plugins/ksplayer-bridge/`.

## Repository Map

- `app/`: Expo Router screens and route layouts. Keep routing decisions here.
- `app/(tabs)/`: Tab screens for home, search, library, and settings.
- `app/settings/`: Settings subpages for add-ons, players, subtitles, downloads, and support pages.
- `app/movie/`, `app/series/`, `app/stream/`: Media details, listing, stream selection, and playback routes.
- `components/`: Reusable UI and feature components.
- `components/coreplayer/`: Shared custom player controls, subtitle handling, stream/audio/subtitle action builders, and playback UI helpers.
- `components/nativeplayer/` and `components/ksplayer/`: Platform player wrappers.
- `clients/`: Network clients for Stremio, OpenSubtitles, TorrServer, intro data, and related services.
- `constants/`: TMDB URL constants and theme tokens.
- `context/`: App-level React context.
- `hooks/`: Shared hooks.
- `utils/`: Platform helpers, storage, library/watch history, stream parsing, subtitles, dates, and media player helpers.
- `plugins/`: Expo config plugins and native bridge source.
- `assets/`, `public/`, `sources/`, `Strmify-screenshots/`: Static assets, PWA files, SideStore source, and screenshots.

## Agentic Operating Mode

When asked to change the codebase, act autonomously unless the request is ambiguous enough that a wrong assumption would be costly.

1. Inspect the relevant files before editing. Prefer `rg` and targeted reads.
2. Identify the route, component, client, or utility boundary that owns the requested behavior.
3. Make the smallest coherent change that solves the user goal.
4. Preserve user work already present in the tree. Do not revert unrelated edits.
5. Keep the code production-grade: readable, maintainable, debuggable, and newcomer-friendly.
6. Run the most relevant non-watch verification command when practical.
7. Summarize what changed, where, and what was verified.

Ask before doing any destructive operation, dependency installation, native build, release build, or change that requires external service credentials.

## Commands

Use these commands from the repository root:

- Install dependencies: `npm install`
- Start Expo dev server: `npm start`
- Run Android dev build: `npm run android`
- Run iOS dev build: `npm run ios`
- Run web app: `npm run web`
- Type-check: `npx tsc --noEmit`
- Run Jest tests once, only when explicitly requested or clearly useful: `npx jest --runInBand`
- Run project tests in watch mode, only for interactive local work: `npm test`
- Export web build: `npm run build:web`
- Android preview build through EAS: `npm run build:android`

Tests are not required by default. Prefer `npx tsc --noEmit`, targeted builds, and clear manual verification notes unless the user asks for tests.

## Coding Standards

- Keep TypeScript strict. Avoid `any` unless the upstream API shape is genuinely dynamic; prefer small local types for TMDB, Stremio, OpenSubtitles, and player payloads.
- Use `@/` imports for project modules.
- Prefer clear names, simple control flow, and small focused helpers. New contributors should be able to trace the feature without hidden magic.
- Separate concerns: routes coordinate, components render/interact, clients call services, utilities transform data.
- Keep React hooks stable with `useCallback`, `useMemo`, and refs where they prevent real rerenders or stale closures.
- Avoid introducing global state when existing context, route params, or storage utilities fit.
- Route navigation should use Expo Router APIs and existing route shapes.
- Store persistent settings through `StorageService` and existing `StorageKeys`.
- Keep network clients in `clients/` or narrow utilities in `utils/`; do not bury service calls inside presentational components.
- Prefer structured parsing for stream, subtitle, and URL data. Avoid fragile string handling unless the format is inherently loose.
- Clean up timers, event listeners, and async effects on unmount.
- Do not log sensitive tokens, full URLs containing credentials, or private user data.
- Keep comments sparse and useful. Explain platform quirks, fallbacks, and non-obvious streaming/player decisions.

## UI And UX Standards

- Match the existing dark, glassy, media-focused UI.
- Use `useTheme()` and themed primitives from `components/Themed.tsx` for app UI.
- Keep screens responsive across phone, tablet, and web. Use stable dimensions for posters, carousels, controls, and player overlays to avoid layout shift.
- Prefer native-feeling controls and iconography from `@expo/vector-icons`.
- Keep player UI touch targets large and accessible. Player overlays must not block core gestures unintentionally.
- Preserve haptics guards through `isHapticsSupported()` before calling Expo Haptics.
- For settings, keep rows scannable and predictable; avoid marketing-style copy.
- Respect platform differences with `Platform.select`, `utils/platform.ts`, and existing player abstractions.

## Streaming And Playback Rules

- Preserve support for both `movie` and `series` content.
- Preserve Stremio add-on compatibility for manifests and stream endpoints.
- For streams, handle direct URLs, `infoHash`, `magnet`, `magnetLink`, and optional embed fields where existing flows support them.
- Do not assume torrent streams are playable without a configured Stremio service or TorrServer-compatible endpoint.
- For series torrents, maintain season/episode file selection behavior and graceful fallback.
- Keep subtitle support compatible with OpenSubtitles downloads and direct subtitle URLs.
- Keep playback errors visible to users through the existing alert/error UI patterns.

## Native And Build Rules

- Be careful with `app.json`, `eas.json`, `codemagic.yaml`, and Expo plugin changes. They affect builds and releases.
- Do not edit generated native folders unless they are intentionally present and owned by the repo.
- Changes under `plugins/ksplayer-bridge/` can affect iOS compilation; verify with iOS build tooling when practical.
- Keep Android cleartext/local-network behavior aligned with the current streaming-server requirements.
- Do not change bundle identifiers, EAS project IDs, update URLs, or app ownership unless explicitly requested.

## Verification Guidance

- Tests are optional and should only be added or run when explicitly requested or when they are the clearest low-cost verification.
- For TypeScript/API shape changes, prefer `npx tsc --noEmit`.
- For route, UI, and player changes, use type-checking plus a manual verification note when a device run is not practical.
- For build/config changes, run the relevant build command when practical.
- If verification is skipped, state why and describe the path that should be manually checked.

## Security And Privacy

- Treat `.env`, API keys, service credentials, and JSON key files as sensitive. Do not print or copy their values into docs, tests, or logs.
- Do not introduce new committed secrets.
- Keep third-party API errors user-safe and developer-informative.
- Avoid expanding permissions, network security exceptions, or arbitrary-load settings unless needed for a user-approved platform requirement.

## Review Checklist

Before finishing, check:

- The change is scoped to the requested behavior.
- Code is readable, maintainable, debuggable, and easy for a newcomer to follow.
- TypeScript/build verification was run when practical, or the reason it was skipped is documented.
- Any new async path has loading, error, and empty states where user-facing.
- Platform behavior is considered for iOS, Android, and web.
- Persistent storage keys and route params are backward compatible.
- No unrelated files or generated artifacts were modified accidentally.
