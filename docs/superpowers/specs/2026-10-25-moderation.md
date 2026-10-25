# Commonplace moderation and launch release

Build the release in the GitHub repository for the owner's later Cloudflare account deployment; do not change the current hosted production site or buy a domain. Preserve anonymous visitor publishing and existing entry data.

New posts default to pending review. Existing posts migrate as published. Public pages/API/feed/sitemaps expose published entries only. Owners may publish, hide, reject or restore entries and resolve/dismiss reports; every mutation has a server-side authorization check and audit event. Use optimistic versions to prevent stale actions. Include global posting pause. Do not implement permanent admin deletion.

Use Cloudflare Access verified RS256 JWTs (issuer, audience, expiry, email allowlist), never an email header alone. Missing auth configuration fails closed. No admin password in code or public bootstrap endpoint. Keep the public website anonymous; Access applies only to /admin* and /api/admin*.

Protect anonymous publishing/reporting with required Cloudflare Turnstile Siteverify validation (action and canonical hostname, bounded token, timeout), HMAC pseudonymous per-network daily keys and atomic D1 fixed-window request quotas, author cooldown, duplicate content detection, honeypots, origin/content-type checks and actual streamed-byte limits. No raw IP addresses in the database. Required secrets missing or infrastructure checks failing must not silently bypass protection. Limit request counts before costly validation. No fake bot-verification bypass in production.

Public receipts remain local to the browser. Add a private receipt-based 'my entries' screen for pending/published submission status and self-deletion; never expose author/delete hashes/network keys. Admin dashboard lists pending/reported/published/hidden/rejected entries with search/pagination, action reasons, audit log, posting controls and configuration readiness.

Provide standalone Cloudflare build/deploy configuration and step-by-step Access/Turnstile/D1/secrets/migrations/domain instructions. Domain is owner supplied later; canonical origin must be configurable. Current live Site remains unchanged until the owner chooses migration. Real external credentials/account activation are explicit remaining setup, not simulated completion.
