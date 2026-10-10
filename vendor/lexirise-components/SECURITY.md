# Security

The maintained version is the latest release. Report vulnerabilities using **Security → Report a vulnerability** on GitHub. Do not post credentials, personal transcripts, local paths or private capture material in issues. If private reporting is temporarily unavailable, open an issue requesting a private reporting channel without disclosing the vulnerability.

The Windows companion binds to loopback. Do not expose its API, development server or desktop filesystem to the Internet. Lexirise keys stay in Windows DPAPI or the userscript manager; never place real keys in Git, Actions secrets, fixtures or artifacts. Account writes require explicit user actions and write tests use mock transports.

The public mobile preview is an allowlisted static browser experiment. It has no desktop API, catalog upload or hosted signaling service. Direct WebRTC pairing is intended for two devices on the same network. Pairing descriptions can contain local network addresses: do not post them publicly. Reports exclude pairing descriptions, frames and keys.

Game files, extracted voices, transcripts, calibration, local configuration and OCR binaries are excluded from distributions. Lexirise exports use explicitly selected destinations verified against the current account. Switching keys requires destination configuration for that credential and does not reuse another credential's export markers.

Pull-request workflows have read-only permissions and no live credentials. Release/deployment writes run only for trusted canonical-repository events. Dependency alerts and periodic Dependabot updates are enabled; contributors should run `npm audit` and report actionable vulnerabilities. Never use a forced automatic downgrade to conceal an advisory.

Checksums and provenance help detect corrupt downloads, but do not constitute a security guarantee. Publication checks scan history and decompressed archives; manual review remains necessary for assets, screenshots and third-party rights.
