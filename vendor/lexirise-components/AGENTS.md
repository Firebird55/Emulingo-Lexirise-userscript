# Agent workflow

Read this file and RELEASE.md first. Inspect Git status and preserve unrelated work, local data, calibration and credentials. Commit each completed logical change after relevant checks; run all checks before pushing. Use `codex/` task branches and release from clean main.

This is an owner-authorized public repository with sanitized history. Never reintroduce the private backups or old private refs. Use a GitHub noreply author/committer email. Do not publish personal profile paths, keys, recordings, databases, game files or account diagnostics.

Shared component source belongs to Lexirise-shared-components. Never edit `vendor/lexirise-components` in consumers. For shared changes: test, commit, publish a new version, then run `npm run shared:update -- --version <version> --all` in the shared repository. Check and commit both consumers before considering the shared work complete.

Real account verification is read-only. Test all account writes with mocks. Store credentials only in host protected storage, never workflow secrets. Preserve toolkit Chinese transcripts, its independent Migaku mode, and userscript storage keys.

Run `npm run lexirise:watch` for public upstream changes. Exit 2 means inspect settings, lookup UI, AI/API docs and language capabilities, not permission to alter accounts. Record the baseline only after compatibility review.

Test desktop/mobile, Shadow DOM, Firefox/Chromium, zoom and Windows DPI/capture bounds as applicable. Run `npm run audit:public` before publication. Release through `npm run release -- --version <semver>`; monitor GitHub-hosted Actions and verify downloaded checksums and provenance. Delivery must not depend on Argo or a cluster.

Only allowlisted static mobile-preview assets may be published on Pages. Desktop services and local data stay on the PC. Follow host-specific workspace location instructions without copying personal paths into the public repository.
