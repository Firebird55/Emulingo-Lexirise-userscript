# Contributing to Lexirise shared components

Read [AGENTS.md](AGENTS.md) and [RELEASE.md](RELEASE.md) before editing. Installation does not authorize an agent to push, publish, write account settings or alter game files; obtain the user's task scope first.

1. Inspect Git status and preserve unrelated work, local data, keys and per-PC calibration. Use a codex/ task branch; publish from clean main.
2. Install Node.js 24, run npm ci and npm run check. Use mocked Lexirise writes and game fixtures; live account verification is read-only.
3. Commit each completed logical change. Run relevant tests before committing and all checks before pushing. Never leave finished work uncommitted.
4. Edit common settings, reader and lookup source here. Publish the shared version, run shared:update --version <version> --all from that repository, then verify both consumers.
5. Test mobile/desktop, narrow containers, window resizing, 100–200% zoom-equivalent viewports, touch targets, Firefox/Chromium and Shadow DOM. Toolkit capture must preserve Chinese source text and Hito/ZZZ/PRAGMATA behavior.
6. Run npm run lexirise:watch for public upstream changes; exit 2 requires review. Never silently accept a baseline or change a real account.
7. Release using npm run release -- --version <semver>, monitor GitHub-hosted Actions, download artifacts and verify SHA-256/source provenance. Keep this repository and the toolkit private; public consumers require explicit owner authorization and sanitized history. Delivery stays independent of Argo/cluster infrastructure.

Never commit credentials, game archives, extracted copyrighted assets, recordings, databases, dependency directories or diagnostics. Rollback preserves user data and storage. See the release runbook for exact commands.
