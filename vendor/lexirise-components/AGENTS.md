# Agent workflow

Read this file and RELEASE.md first. Inspect git status and preserve unrelated work, local data, capture calibration and credentials.
Commit each completed logical change; run relevant checks before committing and all checks before pushing. Do not leave completed changes uncommitted.
Use main for releases; task branches start with codex/. Keep this repository and the toolkit private. A consumer may be public only with explicit owner authorization; never publish private history or account data.
Shared component source is owned here. Never edit vendor/lexirise-components in consumers.
For a shared change: test, commit, publish a new shared version, then run npm run shared:update -- --version <version> --all. Check and commit both consumer integrations before considering the change finished.
Never store keys in source, artifacts, logs or workflow secrets. Real account verification is read-only; test writes with mocks.
Use npm run release -- --version <semver>; monitor hosted Actions and verify downloaded assets/checksums before reporting released versions and URLs.
GitHub-hosted Actions only. Do not couple delivery to Argo or the cluster.
Run npm run lexirise:watch to inspect public Lexirise changes. Exit 2 means review required, not permission to modify accounts. Review settings, lookup UI, AI docs/endpoints and language options; update the baseline only after reviewed compatibility changes.
Test desktop/mobile, Shadow DOM, Firefox/Chromium, browser zoom and Windows DPI/capture bounds. Preserve toolkit's Chinese game transcripts and separate Migaku mode.
Follow the host's workspace instructions for local project locations; do not publish machine-specific paths.
