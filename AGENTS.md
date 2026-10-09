# Agent workflow

Read this file, CONTRIBUTING.md and RELEASE.md before editing. Inspect status and preserve unrelated changes, userscript storage and credentials. Commit each completed logical change after relevant checks; run all checks before pushing. Use codex/ task branches and release from clean main.

This repository is the sanitized public Emulingo project. Never merge or push the old private history into it. Keep the canonical shared-components repository, toolkit and private archive private. Use a GitHub noreply commit email. Never commit profile paths, personal contact details, API keys, tokens, recordings, databases, local settings or diagnostic screenshots.

Shared source is maintained in Lexirise-shared-components. Do not edit generated vendor copies. External contributors can propose shared changes in an issue or patch; a maintainer applies them in the canonical source, releases the package and runs shared:update --version <version> --all before completing them. Public builds use the pinned imported package and need no private credentials.

Run npm run check, npm run test:browser, npm run test:firefox, npm run audit:public and the artifact checks before release. Use mocked account writes; live verification is read-only. Preserve Firefox isolated-world behavior, Shadow DOM portals, native game actions, mobile/desktop layouts and source/translation language isolation.

Release only through npm run release -- --version <semver>. Monitor hosted Actions and verify anonymous install/update URLs, checksums and source provenance. Stable release assets keep fixed .user.js and .meta.js names; prereleases must not replace the stable update channel. Keep the script name/namespace and storage keys stable. No eval-based updater or embedded GitHub credential.

GitHub-hosted Actions only; no Argo or cluster dependency. Pull requests get read-only workflows, never pull_request_target with untrusted checkout. Never publish or upload on behalf of a user without task authorization.

Run npm run lexirise:watch for upstream docs/settings/lookup/language changes. Exit 2 means review, not permission to change accounts. Respect LICENSE and third-party notices. Follow host workspace instructions for local folders without publishing private paths.
