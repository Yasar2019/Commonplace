# Immediate publishing implementation plan

> Execute inline using superpowers:executing-plans.

**Goal:** New valid entries publish immediately with existing spam protection and owner moderation afterward.
**Architecture:** Change submission status and response, retain published-only projections, align client state and copy.
**Tech Stack:** TypeScript, React, Vinext, Cloudflare Workers/D1, Node test runner.
**Spec:** docs/superpowers/specs/2026-10-26-immediate-publishing-design.md

## Constraints
No bulk publication, schema change, security bypass, dependencies or secrets in GitHub.

## Review focus
Published entry reaches public projections immediately; hiding removes it; legacy pending remains private; invalid tokens and flood attempts still fail; posting from an older page shows the newest entry without corrupting pagination.

## Task 1: Immediate publication and aligned experience
- [x] Change submission tests to expect published status, public listing and owned receipt state. Explicitly seed legacy pending state for its report visibility test. Add invalid-token, hide/restore, pending preservation and full legacy queue regressions.
- [x] Run backend tests; observe expected failures against pending implementation.
- [x] Change submitEntry insertion/response to published; remove pending queue capacity predicates and adjust moderation configuration error.
- [x] Update client success handling and public copy. For posting on an older page, navigate home after saving receipt; on page one refresh the authoritative stream. Default dashboard to reported.
- [x] Update README/API/deployment documentation and privacy date.
- [x] Run whole test suite, typecheck, lint changed files, and standalone production build.
- [x] Review complete diff and address issues; push with expected main SHA and verify the remote tree/commit.

## Validation
- 38 tests pass, including the new immediate-publication regressions (observed failing before implementation).
- TypeScript check and standalone Cloudflare build pass.
- Independent review approved; backend, security and SEO suites also passed separately.
- Changed-file lint retains pre-existing Journal effect/internal-link errors and the backend unused import warning; no new lint findings.
- No schema, dependencies, secret or hosting configuration changes.
