<p align="center"><img src="docs/banner.svg" alt="Emulingo Lexirise — readings, word lookups and language settings" width="900"></p>

# Emulingo Lexirise

[![Checks](https://github.com/Firebird55/Emulingo-Lexirise-userscript/actions/workflows/ci-release.yml/badge.svg)](https://github.com/Firebird55/Emulingo-Lexirise-userscript/actions)
[![Release](https://img.shields.io/github/v/release/Firebird55/Emulingo-Lexirise-userscript)](https://github.com/Firebird55/Emulingo-Lexirise-userscript/releases/latest)
[![License: attribution required](https://img.shields.io/badge/license-attribution_required-7c62d6)](LICENSE)

Language-aware readings and word lookups for **[Emulingo](https://emulingo.com)**, powered by **[Lexirise](https://lexirise.app)**. Built by **[Firebird55](https://github.com/Firebird55)**.

**[Install the userscript](https://github.com/Firebird55/Emulingo-Lexirise-userscript/releases/latest/download/emulingo-lexirise.user.js)** · [Release downloads](https://github.com/Firebird55/Emulingo-Lexirise-userscript/releases/latest) · [Installation guide](INSTALL.md) · [Contribute](CONTRIBUTING.md)

## What it adds

- Readings, proficiency colors and inline meanings in Emulingo's translation feed.
- A shared lookup window: definitions, pronunciation, examples, contextual help, similar words, vocabulary actions and applicable grammar/character information.
- Language-aware settings for 31 Lexirise study languages, with an explicit content-language override when Emulingo metadata is missing.
- Account settings reload/save/discard. Local display options apply immediately; only **Save to Lexirise** writes account preferences.
- Desktop sidebar and mobile layouts, touch targets, narrow screens, landscape and browser zoom. Native Emulingo controls remain available.
- Second-screen support on `/panel` for any pairing code; Lexirise settings sit beside the panel's native Settings tab.
- Hides Emulingo's inline grammar explanations on `/play` and `/panel`, even before connecting a key. Translations and native actions remain; Lexirise's lookup Grammar tab is still available.

## Quick start

1. Enable a supported userscript manager: [Tampermonkey](https://www.tampermonkey.net), [Violentmonkey](https://violentmonkey.github.io), or [Userscripts for Safari](https://github.com/quoid/userscripts).
2. Open the **[install link](https://github.com/Firebird55/Emulingo-Lexirise-userscript/releases/latest/download/emulingo-lexirise.user.js)**, review the script and approve installation in your manager.
3. Visit [Emulingo play](https://emulingo.com/play), then open **Lexirise settings** beside Emulingo's settings button.
   The paired second screen at `https://emulingo.com/panel?code=<your-code>` works too, without restricting the code.
4. Enter your own Lexirise API key. Features require the access provided by your Lexirise account; this project does not bypass service plans or limits.

No Node.js or local game files are needed for the normal userscript install. If the browser downloads the file instead, import it using the manager dashboard. Mobile manager availability and update scheduling vary by browser; see [INSTALL.md](INSTALL.md).

## Updates

Stable releases publish fixed `.meta.js` and `.user.js` assets. Their URLs are embedded in the script header, so a userscript manager with automatic updates enabled can check for and install newer releases on its schedule—not instantly when GitHub publishes. Older locally imported versions need **one manual update from the install link** to acquire this metadata; keep the same script name and namespace to preserve storage.

[Update metadata](https://github.com/Firebird55/Emulingo-Lexirise-userscript/releases/latest/download/emulingo-lexirise.meta.js) · [Release/rollback runbook](RELEASE.md)

## Privacy and security

Your API key stays in userscript-manager storage. Analysis and explicit word/account actions communicate directly with Lexirise; relevant text is sent to that service. No key is sent to GitHub, bundled with releases, or stored by a project server. GitHub hosts source and downloads, not your learning data.

This public repository starts with a sanitized snapshot. Prior private history, local key files and diagnostic images were not imported. See [privacy review](docs/PUBLICATION-AUDIT.md) and [security reporting](SECURITY.md). Automated scanning reduces risk; it is not a guarantee against every possible secret format.

## Development

```sh
npm ci
npm run check
npx playwright install chromium firefox
npm run test:browser
npm run test:firefox
npm run audit:public
```

Node.js 24 is recommended. A clean public checkout builds using the pinned local package in `vendor/lexirise-components`; no private repository login is needed. Shared code remains generated: propose changes through the documented maintainer workflow, not by committing edits to vendor.

Mock previews: `npm run preview` → http://127.0.0.1:4317/play. Do not put real account keys into a public issue, screenshot, fixture or pull request.

## Contributing and credit

Bug reports, documentation improvements and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md) and [release instructions](RELEASE.md). The local installers include these guides too.

Original project code is available under the **[Firebird55 Attribution License](LICENSE)**: reuse and modifications are permitted, but publicly distributed derivatives must visibly credit **Firebird55** and link to this project. It is a custom permissive license, not standard MIT. Third-party dependencies retain their own licenses and bundled notices.

This is an independent community enhancement, **not affiliated with or endorsed by Emulingo or Lexirise**. Their services, trademarks, game content and API terms remain their own.

[Emulingo](https://emulingo.com) · [Lexirise](https://lexirise.app) · [Lexirise API reference](https://lexirise.app/api-reference)
