# Changelog

All notable changes to TGIM are documented here. This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and follows pre-1.0 `0.y.z` versioning — breaking changes may occur in minor releases until `1.0.0`.

## [Unreleased]

## [0.1.1] - 2026-08-30

### Added
- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, civic scope), `.github/ISSUE_TEMPLATE/*` (bug/feature with guardrail checks), `.github/pull_request_template.md` with privacy/audit checklist
- `CHANGELOG.md` (Keep a Changelog)

### Changed
- Web public record now filters by `?search=` / `?q` and `?category=` with clear-filters control; mobile nav de-duplicated (`#evidence` anchor)
- `SECURITY.md` prefers GitHub private advisory as sole channel (removes placeholder `security@tgim.example`)

## [0.1.0] - 2026-08-30

### Added
- Apache-2.0 `LICENSE` (GitHub detected), comprehensive `README` with anchor sentence, mermaid architecture, and pincode-first Mumbai geography
- `CONTRIBUTING.md` with guardrails, branch/verify contract, and dual-mode persistence rules
- `SECURITY.md` with private advisory reporting and four hard invariants (zero-leak privacy, scope-grant auth, double-entry audit, sovereign OIDC/MCP)
- GitHub repository description + 10 topics, `AGENTS.md` canonical with `CLAUDE.md` symlink
- First tagged release for Codex for OSS review

### Fixed
- CI `verify.yml` YAML parsing

[Unreleased]: https://github.com/devrobinransom/tgim/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/devrobinransom/tgim/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/devrobinransom/tgim/releases/tag/v0.1.0
