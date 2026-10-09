# Install Lexirise shared components

Private React/TypeScript library providing the settings panel, reader, lookup window, types and capabilities used by both applications.

## Installation

1. This is a developer library, not a third standalone web app. End users get it through the Emulingo and toolkit installers. No game files or API credentials are needed here.

2. For contributing: download the source ZIP or clone the private repository with your authenticated GitHub account. Install Node.js 24. From the source folder run npm run setup, or double-click Install.cmd on Windows. This installs locked dependencies and checks/builds the library.

3. For another React application: download the verified release .tgz, then use npm install /path/to/firebird55-lexirise-components-VERSION.tgz in that application. React and React DOM are peer dependencies. Import @firebird55/lexirise-components and its styles.css; provide your own transport, storage and popup portal.

4. For the two existing applications, edit shared source here, publish a release, then run npm run shared:update -- --version <version> --all from the shared source checkout. Both sibling consumer folders are checked and their generated pinned imports committed.

5. Read AGENTS.md and RELEASE.md before making changes. Never edit a consumer's vendor/lexirise-components directory manually.

Package installation into another host is an explicit developer action. Credentials are supplied only by the host adapter. Source ZIPs include the developer installer and contribution instructions; the package includes the same agent documentation.

## Agent and contributor instructions included in the installer

Read [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md) and [RELEASE.md](RELEASE.md). Inspect status; preserve unrelated work and local data. Commit logical changes, run checks before pushing, edit shared code only in its source repository, and use the documented release command. No credentials or game assets belong in commits or installer bundles. Installer setup is not permission for an agent to publish or change account settings.

## Checksums and rollback

Download SHA256SUMS beside the release assets; compare SHA-256 hashes before running an installer. Use gh release download <tag> --repo Firebird55/Lexirise-shared-components --dir <empty-folder> for authenticated downloads. Install an earlier immutable release to roll back, keeping local data, keys and userscript-manager storage. See [release runbook](RELEASE.md).
