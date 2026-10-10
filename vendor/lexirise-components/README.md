# Lexirise shared components

Shared React/TypeScript package for Emulingo Lexirise userscript and Game immersion toolkit.

This is a developer library, not a standalone application. End users receive it through the two application installers; it needs no game files or key itself. The source ZIP includes **Install.cmd**, or run **npm run setup** on any Node.js 24 platform. Both install locked dependencies and check/build the library. Other React hosts can install the verified release tarball with npm.

See [installation](INSTALL.md), [installer guide](INSTALL.html), [contributing with agents](CONTRIBUTING.md) and [agent rules](AGENTS.md). All installers include these instructions. Shared settings and lookup UI adapt to mobile/desktop, narrow host containers and touch input.

Exports: `ReadingOptionsControls`, `ReadingOptionsDialog`, `SettingsPanel`, `createReader` (reader and identical LookupWindow), `createLexiriseClient`, account PATCH helpers, scoped CSS, types and versioned 31-language capabilities.
React is a peer dependency. Each host owns credential storage, transport, popup portal and local preferences. No credential belongs in this repository.

`npm ci && npm run check`
See [release runbook](RELEASE.md). Published package copies in sibling applications are generated; edit this repository, never a consumer's vendor directory.

Account settings are read when the panel opens or reconnects. Local display settings apply immediately. Only Save to Lexirise writes remote settings. Read-only fields are excluded; unrelated language settings remain unchanged.
Capability data was reviewed against [Lexirise API reference](https://lexirise.app/api-reference) and public language options on 2026-10-09.

Original software by [Firebird55](https://github.com/Firebird55/Emulingo-Lexirise-userscript), under the included custom visible-attribution license. See LICENSE and THIRD_PARTY_NOTICES.md.
