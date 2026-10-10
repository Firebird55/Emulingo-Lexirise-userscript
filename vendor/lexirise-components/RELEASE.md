# Release and compatibility runbook

## Development
Install Node 24. Run npm ci and npm run check. Never edit generated consumer vendor copies.
The source ZIP includes Install.cmd / npm run setup as a developer installer. It includes INSTALL.md, INSTALL.html, AGENTS.md and CONTRIBUTING.md. This library is not a standalone app and does not need game files. The installable package carries the same documentation.
Keep credentials in the host application's DPAPI/userscript-manager storage.

## Shared release
From a clean main checkout:
1. npm run release -- --version 1.0.0 (use the next unused semantic version subsequently).
2. gh run list --repo Firebird55/Lexirise-shared-components; gh run watch <run-id> --exit-status.
3. gh release download v1.0.0 --repo Firebird55/Lexirise-shared-components --dir <empty-folder>.
4. Verify SHA256SUMS and PROVENANCE.json sourceCommit against the annotated tag's commit.
5. npm run shared:update -- --version 1.0.0 --all.
The update command uses the GitHub CLI, verifies checksum and source revision, imports both siblings, refreshes their lockfiles, runs checks and commits generated changes. CI requires no private cross-repository credentials.
It invalidates stale local-package lock metadata, uses a fresh npm ci installation, and compares every installed shared file with the verified vendor payload before building. Stop the toolkit companion before this command and restart it after verification so Windows does not lock its built frontend.

## Public-reference change check for agents
Run npm run lexirise:watch. The report in .watch/ covers API/AI docs and publicly shipped UI bundle changes, including settings/lookup/language options. It is an advisory change detector, not a semantic guarantee or an automatic code updater. Exit 2 means inspect the official reference and published UI changes. Review capability data, transport contracts, lookup parity and tests. No authenticated account request is made.
After reviewed adaptations, run npm run lexirise:watch -- --record in the shared repository, test and commit the new baseline, release and update both apps. Agents in either consumer have the same command through the imported package.

## Rollback
Release tags and assets are immutable. If a published build fails, fix the source and publish a new version; do not replace existing assets.

Install a prior shared version using shared:update --version <prior> --all, then release new consumer versions. Do not rewrite released tags. Local data and keys are outside the package and must be preserved.

## CI and assets
Ubuntu GitHub-hosted runner; npm ci, type checks, contracts, builds and secret/history scan. Tag workflows rebuild and publish an installable tarball, source ZIP, declarations, capability manifest, provenance and SHA-256 checksums. React remains a peer dependency.
