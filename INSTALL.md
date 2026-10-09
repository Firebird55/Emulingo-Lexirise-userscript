# Install Emulingo Lexirise

## Desktop

Enable a supported userscript manager such as [Tampermonkey](https://www.tampermonkey.net) or [Violentmonkey](https://violentmonkey.github.io). Open [the permanent install link](https://github.com/Firebird55/Emulingo-Lexirise-userscript/releases/latest/download/emulingo-lexirise.user.js), review the script and approve installation. If it downloads as a file, import it through the manager dashboard instead. Follow your manager's instructions for browser permissions (including Chrome's user-script/developer settings when applicable).

Reload https://emulingo.com/play, open Lexirise settings beside the native settings button, and enter your own Lexirise API key. No Node.js, GitHub login or local game files are needed.

The second-screen panel is also supported at `https://emulingo.com/panel?code=<your-code>` for any code (or without a code). Its Lexirise button appears beside the native Settings tab. Pair the panel normally through Emulingo; this script does not bypass pairing or authenticate a game session.

## Mobile

Use a userscript manager supported by your mobile browser. Safari users can consult [Userscripts' platform instructions](https://github.com/quoid/userscripts). Open the install link or import the downloaded .user.js, enable the manager for Emulingo, then reload the play page. Not every mobile browser supports userscripts.

The script supports both mobile and desktop feeds; the extension manager determines installation/update support. Userscripts for Safari supports update metadata, but its upstream documentation notes implementation limitations: use its update button or reimport the stable file if automatic checking is not available in your installed version.

## Automatic updates

The metadata header contains:

- updateURL: https://github.com/Firebird55/Emulingo-Lexirise-userscript/releases/latest/download/emulingo-lexirise.meta.js
- downloadURL: https://github.com/Firebird55/Emulingo-Lexirise-userscript/releases/latest/download/emulingo-lexirise.user.js

Enable automatic script updates in the manager. It checks on its configured schedule; the release does not push code into an already open page. Reload Emulingo after an update. Permission/source changes may require review. Older local/private versions need one manual update to this public build to acquire the URLs; retain the same name, namespace and manager storage.

Do not embed GitHub tokens or Lexirise keys in download URLs. A fork must use its own update channel, not silently point users at upstream updates.

## Optional local installer

The release installer ZIP contains Install.cmd, INSTALL.html, the standalone script and agent/contribution/license documents. Double-click Install.cmd on Windows, or run node scripts/install.mjs on another Node.js platform. Without Node.js, open INSTALL.html for manual installation. The helper only serves approved files on loopback; it does not silently install extensions or approve permissions.

Source contributors can use npm run setup -- --contribute. Read AGENTS.md, CONTRIBUTING.md and RELEASE.md before agent work.

## Verification and rollback

Download SHA256SUMS and compare the asset's SHA-256 before importing. Original licensing and third-party notices are included in the script, installer ZIP and release assets. To roll back, install a prior public release and temporarily disable manager auto-updates; preserve manager storage and keys. See RELEASE.md.
