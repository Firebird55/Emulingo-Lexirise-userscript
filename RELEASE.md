# Release and update runbook

## Preconditions

Use a clean main checkout, Node.js 24 and GitHub CLI access to this public repository. Configure a GitHub noreply author/committer email. Never import the old private history. Shared source changes require a released package and the maintainer's shared:update --version <version> --all workflow; public builds themselves use a credential-free pinned local package.

## Publish

```sh
npm run release -- --version 1.2.0
```

Use the next unused higher semantic version for subsequent releases. The command checks the vendor pin, types, contracts, build and public privacy gate, synchronizes versions, commits and pushes an annotated tag.

Monitor the Checks and release workflow. Hosted Ubuntu jobs install reproducibly, run Chromium/Firefox and isolated-world checks, scan reachable history, package artifacts and verify update metadata, notices, hashes and provenance. Only tag publication gets repository write permission. PRs never publish or receive a Lexirise key.

The tag workflow publishes:
- emulingo-lexirise.user.js — fixed stable installation/download name
- emulingo-lexirise.meta.js — fixed metadata-only update check
- a versioned .user.js and installer ZIP for rollback
- LICENSE.txt, NOTICE.md, THIRD_PARTY_NOTICES.txt, guides, provenance and SHA256SUMS

Stable releases become GitHub's latest release. Prereleases must remain prereleases and must not replace that channel. Do not move release tags. The userscript's name, namespace and storage keys stay unchanged. Never use runtime eval to replace installed code.

## Verify delivery

Download the hosted assets; verify SHA256SUMS and PROVENANCE.json against the tag commit. Fetch these URLs **without GitHub authentication** and compare version, metadata and script hashes:

- https://github.com/Firebird55/Emulingo-Lexirise-userscript/releases/latest/download/emulingo-lexirise.meta.js
- https://github.com/Firebird55/Emulingo-Lexirise-userscript/releases/latest/download/emulingo-lexirise.user.js

Install/import the stable URL through the user's manager once. Managers then check according to their own settings; Safari manager limitations are documented in INSTALL.md. An update-source/permission change may require user approval.

## Rollback

Install the versioned .user.js from an earlier public release and disable automatic updates temporarily. Preserve manager storage. For a channel-wide regression, publish a higher patch version containing the known-good code; do not decrease versions or rewrite old tags.

## Upstream compatibility

npm run lexirise:watch reads public API docs and website bundles. Exit 2 flags a review, not permission for real account writes. Keep changes in the canonical shared source and test both hosts. Keep toolkit, canonical shared repository and private history archives private. Releases are independent of Argo/cluster infrastructure.
