# GitHub Copilot Instructions

## Project context

Strmify is an Expo Router and React Native app written in strict TypeScript. `app/` owns routes and screens, `components/` owns app-specific UI and player components, `clients/` owns service integrations, and `utils/` owns shared helpers. See the root `AGENTS.md` for the fuller project map and existing conventions.

The supported app platforms are iOS and Android. Web support is not required.
These platform requirements take precedence over any conflicting web-support guidance in `AGENTS.md`.

## Engineering principles

- Keep code simple, readable, and easy to understand, debug, and maintain. Prefer clear names and straightforward control flow over clever abstractions.
- Prefer shared UI from `@vjdev1212/media-ui-kit` before creating a new component. Put genuinely reusable cross-app components in the `media-ui-kit` repository; keep Strmify-only behavior, such as route navigation and app data, in this repository.
- Treat performance as a core requirement. Avoid unnecessary renders, state, effects, and expensive work on the UI thread. Use efficient, virtualized lists for growing collections and clean up asynchronous work, timers, and listeners.
- Preserve strict TypeScript and existing patterns. Handle loading, empty, and error states explicitly for user-facing asynchronous work.
- Do not generate or scaffold `.test.ts` or `.test.tsx` files as part of a change. Avoid creating new test files unless the user explicitly asks for them or the project already requires them.

## UI and platform requirements

- Before implementing or changing UI, consult and follow both platform design guidelines:
  - Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines
  - Android design guidance: https://developer.android.com/design/ui/mobile/guides/foundations
- Use Expo UI universal controls by default for controls shared across iOS and Android. Consult the relevant Expo UI documentation before choosing or implementing a control:
  - Universal components and controls: https://docs.expo.dev/versions/latest/sdk/ui/universal/
  - SwiftUI components: https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/
  - Jetpack Compose components: https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/
  - Drop-in replacements: https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/
- Prefer a universal Expo UI control when it meets the requirement. Use Expo UI SwiftUI or Jetpack Compose controls only when a platform-specific control or behavior is required and a suitable universal control is unavailable.
- Do not add third-party or other external UI controls. Use controls from Expo UI, including controls documented in Expo UI's Drop-in replacements, and use platform-native controls through Expo UI only when necessary.
- Prefer shared React Native code that works on both iOS and Android. Use platform-specific files or checks only when a native behavior or platform guideline requires a difference, and keep shared behavior and types aligned.
- Do not add web-specific features or spend effort on web parity unless explicitly requested. Preserve existing web-related files when a change does not require touching them.
- When changing UI, check the result on both iOS and Android when practical; otherwise, call out any platform behavior that still needs device verification.

## Native experience and quality

- Favor familiar platform behavior over custom interaction patterns. Use Expo Router and Expo UI's native navigation and controls; don't recreate standard system controls, gestures, dialogs, or menus without a clear product need.
- Use Expo UI universal controls first. For a control not covered by Expo UI, check its documented Drop-in replacements. Do not introduce third-party control libraries or custom controls outside those documented replacements. Keep shared components in `@vjdev1212/media-ui-kit` consistent with these restrictions.
- Respect safe areas, system bars, keyboard behavior, back navigation, orientation changes, and app lifecycle on both platforms. Keep controls reachable and content readable on different phone and tablet sizes.
- Make every interactive element usable with VoiceOver and TalkBack: provide meaningful labels, roles, and state; preserve logical focus order; maintain readable contrast and sufficiently large touch targets. Support text scaling without clipping or hiding essential controls.
- Give prompt, clear feedback for user actions. Use haptics sparingly for meaningful interactions and guard platform-specific APIs. Keep transitions purposeful, interruptible where users can interact during motion, and respectful of reduced-motion preferences.
- Keep UI work off the JavaScript thread when possible. Avoid unnecessary renders and unbounded lists; use virtualization for long collections, stable keys, appropriately sized media, and cleanup or cancellation for asynchronous work.
- Verify real interaction flows on both iOS and Android when practical, including accessibility, keyboard, navigation, and loading/error states. Test performance on devices rather than relying only on web previews or development-mode behavior.
