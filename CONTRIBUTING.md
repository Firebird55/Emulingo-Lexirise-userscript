# Contributing

Thanks for helping improve Emulingo Lexirise. Please keep discussion respectful, describe reproducible behavior and preserve user privacy.

## Report a bug or suggest a feature

Use the repository's issue templates. Include browser/userscript-manager versions, viewport size, mobile/desktop layout and steps to reproduce. Use the mock fixture where possible. Never include API keys, authentication headers, account exports or private captures. Report security issues privately through GitHub's security reporting feature; see SECURITY.md.

## Submit a pull request

1. Fork the public repository and create a codex/ task branch (a descriptive feature branch is also fine for human contributors).
2. Use a GitHub noreply commit email; this repository's privacy gate rejects personal author/committer email addresses.
3. Install Node.js 24, run npm ci, then npm run check.
4. Run npm run test:browser, npm run test:firefox and npm run audit:public. Install Chromium/Firefox with npx playwright install chromium firefox if needed.
5. Add a focused regression test. Mock account writes and retain native game actions, Firefox behavior, Shadow DOM isolation and source-language semantics.
6. Commit completed logical changes and explain the change, tests and any limitations in the pull request.

The vendored shared package is a generated, versioned import. Its canonical source is maintained separately by Firebird55. For a shared reader/settings/lookup change, open an issue or attach a proposed patch; a maintainer implements/tests it in that source repository, releases the package and imports it into both hosts. Do not edit or submit generated vendor files directly. A public checkout needs no access to the private canonical repository.

## Releases

Only maintainers with authorization publish. Follow RELEASE.md and use npm run release -- --version <semver>. CI tests and audits before publishing. Pull requests receive read-only jobs with no real Lexirise credential.

## License and attribution

Contributions must be yours to contribute and are submitted under LICENSE, with their authorship notices retained. Original code and shared components are credited to Firebird55. Public derivatives must retain notices and visible Firebird55 credit linking to this project; do not imply endorsement by Firebird55, Emulingo or Lexirise.
