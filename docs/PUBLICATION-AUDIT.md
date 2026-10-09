# Public publication review

Reviewed 2026-10-09 for the first public distribution.

The public project is a tracked-source snapshot, not a visibility flip or a merge
of the prior repository. Original history, releases, Actions logs and local
ignored files are retained separately in private storage.

Excluded from the new public history:
- prior author/committer personal contact metadata;
- machine-specific profile paths in project/distributable documentation;
- historical diagnostic captures;
- ignored key files, manager storage, dependencies, release output and local logs.

The imported shared package is pinned, checksum/provenance verified, and carries
its original-code attribution license. Its distributable documentation was fixed
in the canonical source, not manually edited in vendor.

Before publication, the release gate checks all tracked files, reachable blobs
and commit metadata. Installer assets contain only approved code, guides and
licensing files. Public builds require no private repository or Lexirise key.
Release downloads and update metadata are verified anonymously after deployment.

These checks address known patterns and reviewed boundaries, not a mathematical
guarantee that no unknown secret format can exist. Report concerns privately.
