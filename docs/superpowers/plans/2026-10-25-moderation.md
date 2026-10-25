# Moderation and spam protection implementation plan

> **For agentic workers:** Follow the defined interfaces; review and verify before publishing source. User authorized implementation and GitHub synchronization; Cloudflare activation follows account setup.

**Goal:** Ship a moderated anonymous journal and a documented standalone Cloudflare deployment path.
**Architecture:** Thin framework routes call portable typed services with D1 storage. Cloudflare Access protects owner operations; Turnstile and atomic database counters protect anonymous writes. New posts enter pending review.
**Tech Stack:** Existing React/Vinext/Workers/D1, Zod, jose for verified Access JWTs.
**Spec:** docs/superpowers/specs/2026-10-25-moderation.md

## Global constraints
- Preserve data; append migrations; existing entries published, new entries pending.
- No privileged data or secrets in public response projections or bundles.
- Missing security configuration fails closed; no production test bypass.
- Keep this release off the current live Site while preparing the Cloudflare handoff.

## Review focus
- Forged/expired/wrong audience JWTs and wrong owners are rejected.
- Every public surface excludes pending/hidden/rejected entries, including direct URLs.
- Cleared cookies, simultaneous requests, duplicate submissions and Turnstile replays cannot bypass intended checks.
- Admin mutations are atomic, version checked, audited, and reject cross-origin requests.
- Unicode, oversized/chunked bodies, verifier failures and unavailable configuration fail predictably.

### Task 1: Security, storage and route services
- [x] Add failing security/SQL tests with real in-memory SQLite, migration preservation, state transitions and privacy assertions.
- [x] Implement appended schema, portable helpers, server services, public projections, owner APIs and Access JWT verification.
- [x] Verify unauthorized actions, quotas, duplicate detection, stale versions, paused posting, receipt deletion and audit records.

### Task 2: Moderation and visitor UI
- [x] Build owner dashboard against the API contract in docs/moderation-api.md.
- [x] Integrate reusable Turnstile widgets for publishing/reporting; pending submission UI and receipt management.
- [x] Verify loading/errors, no leaked fields, accessible forms, and successful UI rendering.

### Task 3: Cloudflare packaging and handoff
- [x] Add validated standalone build config, deployment scripts and owner setup guide.
- [x] Make canonical origin configurable; document migrations, backups, secrets, Access path policies and Turnstile hosts.
- [x] Run all tests/typecheck/build and independent security review; push source to GitHub with deployment activation limits clearly stated.

## Verification and handoff
35 tests passed, including real SQLite migration preservation, moderation transitions/visibility, concurrent quota admission, Access JWT and Turnstile contract failures. Typecheck and regular production build passed. Standalone build validated with synthetic account configuration (removed after build). Independent security review found and verified a fix for cross-origin quota poisoning; audit search, input bounds and timestamps also corrected. Browser QA unavailable at final pass because the preview daemon stopped; authenticated production UI and real challenge/JWT configuration still require owner Cloudflare setup. No current live Site or Cloudflare account changed.
