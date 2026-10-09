# Security and privacy

Report vulnerabilities privately using this repository's GitHub security reporting feature. Do not post keys, account exports, authentication headers or private captures in a public issue.

API keys remain in userscript-manager storage. Relevant text and explicit actions are sent directly to Lexirise; GitHub only serves source and releases. Do not use a live account key in CI. Live developer verification is read-only; writes use mocks.

The public history is a new sanitized snapshot. Local files and prior private commits, diagnostic screenshots and Actions logs were not imported. Publication gates scan tracked files, reachable blobs and commit metadata for known credential formats, personal profile paths and non-noreply author emails. This is defense in depth, not proof that every unknown secret format can be detected.

Release scripts retain upstream licenses and require stable anonymous HTTPS update URLs without credentials/query tokens. Review updates and trust only the intended maintainer. Forks must reconfigure their own channel. Security fixes are delivered as higher tested versions.

Public PR jobs have read-only permissions and no project API credentials. Tag publication alone receives GitHub's short-lived repository token. No pull_request_target checkout of untrusted code, long-lived publishing token or cluster dependency is used.
