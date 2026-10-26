# Deploy Commonplace to your Cloudflare account

This prepares a separate deployment in your account. It does not move the current hosted Site, import its database, create Access applications, create Turnstile credentials, purchase a domain, or deploy automatically. Keep the existing Site running until you have separately planned and verified its data migration.

## 1. Prepare your account and public origin

Use the repository's locked dependencies with Node 22.13+ and its declared pnpm version. Sign in to your own Cloudflare account with `pnpm exec wrangler login`. This login and all commands marked remote below are actions for the owner to run when ready.

Choose the HTTPS hostname you will actually serve, for example `https://journal.example.org` or your assigned Workers hostname. Buying and configuring a custom domain can happen later. Use an origin only: no trailing slash, credentials, path, query or fragment. The exact origin must match where visitors submit forms and the hostname allowed by Turnstile.

Create a new, separate D1 database:

```sh
pnpm exec wrangler d1 create commonplace
cp cloudflare.example.json cloudflare.config.json
```

Fill the ignored `cloudflare.config.json` with your account ID, Worker name, returned D1 database UUID/name, and configuration below. The binding must remain `DB`. This file deliberately accepts only known configuration fields; use Cloudflare secret storage for secret values. Never put account API tokens or secrets in the repository.

| Setting | Required value |
| --- | --- |
| `SITE_URL` | Canonical public HTTPS origin |
| `ADMIN_EMAILS` | Explicit comma-separated owner email addresses; no wildcard |
| `ACCESS_TEAM_DOMAIN` | `https://YOUR-TEAM.cloudflareaccess.com`, with no trailing slash |
| `ACCESS_AUD` | Access application's 64-character audience tag |
| `TURNSTILE_SITE_KEY` | Real public Turnstile widget site key |
| D1 binding `DB` | Your account's database UUID and database name |

`NEXT_PUBLIC_SITE_URL` is compiled into metadata, canonical links, sitemap and feed URLs. The standalone build derives it from `SITE_URL` so runtime origin checks and generated links agree. Changing hostname requires rebuilding and redeploying.

## 2. Protect only the owner paths with Cloudflare Access

In Cloudflare Zero Trust, configure a self-hosted Access application for the chosen hostname. Include both path patterns `/admin*` and `/api/admin*` in that application, with one shared audience tag. These cover the dashboard and moderation API, including nested routes. Do not protect the entire hostname: public reading, publishing, reports and receipt-based status remain anonymous.

Create an Allow policy restricted to the exact owner email address(es). Use a supported identity provider or emailed one-time PIN. Do not add an Everyone policy or Bypass rule. Copy the team issuer origin and application audience into the config. If you accidentally create separate applications with separate audiences for the two paths, replace them with a single application covering both paths.

The application verifies the Access RS256 JWT signature, issuer, audience, expiry, and owner email allowlist on the server. An email header alone cannot authorize an owner. There is no admin password, bootstrap endpoint or development authentication bypass. An unprotected alternate hostname cannot bypass server verification; nevertheless configure Access consistently on every hostname used by owners.

## 3. Create a real Turnstile widget

In Cloudflare Turnstile, create a production widget and allow the exact public hostname (hostname only, without `https://`). Set `TURNSTILE_SITE_KEY` in the config; keep its paired secret for the next step. Do not use testing keys on the public deployment.

The publish form requests action `publish`; report forms request action `report`. Server validation must receive a successful Siteverify result with the matching action and canonical hostname. Expired/reused tokens require a fresh challenge. Validate both publishing and reporting on the final hostname before opening submissions.

## 4. Check and build locally

```sh
pnpm run check:cloudflare
pnpm run build:cloudflare
```

The check validates configuration, not external credentials or account permissions. The build uses `COMMONPLACE_TARGET=cloudflare`, preserves the Sites packaging integration, disables Sites mock authentication and connector preview, and generates `dist/server/wrangler.json` for your account. The ordinary Sites build remains available through `pnpm run build`.

Review the generated file before any remote command. Confirm Worker name, account, database UUID, `SITE_URL`, Access values and widget key. No secrets should appear there. Do not deploy with a hand-written replacement Wrangler config: the generated config also contains the bundled entrypoint and asset wiring.

For a local standalone preview, set `COMMONPLACE_TARGET=cloudflare` when starting the development server. Local security remains enforced; real canonical-origin, Access and Turnstile checks can intentionally prevent local submissions. There is no fake-token or local-owner bypass.

## 5. Set runtime secrets in your account

The Worker needs these two secrets in addition to its five non-secret vars and `DB` binding:

```sh
pnpm exec wrangler secret put RATE_LIMIT_SECRET --config dist/server/wrangler.json
pnpm exec wrangler secret put TURNSTILE_SECRET --config dist/server/wrangler.json
```

Supply a cryptographically random `RATE_LIMIT_SECRET` of at least 32 characters, generated with a password manager or `openssl rand -hex 32`. Do not reuse an example string. This secret derives daily pseudonymous network keys; rotating it resets continuity for those keys. Supply the matching real widget secret as `TURNSTILE_SECRET`. Keep secrets out of shell arguments, logs, source and the JSON config. For local use, Wrangler's ignored `.dev.vars` can supply secrets, but cannot bypass authentication or bot verification.

If no Worker exists yet, Wrangler may prompt to create it while adding secrets. Verify the intended account and Worker name. Missing secrets or failed external security checks must leave mutations unavailable, not disable protection.

## 6. Apply migrations and deploy when ready

Inspect every SQL migration in `drizzle/`. On an empty new database, apply the whole sequence before deployment:

```sh
pnpm exec wrangler d1 migrations list DB --remote --config dist/server/wrangler.json
pnpm exec wrangler d1 migrations apply DB --remote --config dist/server/wrangler.json
pnpm exec wrangler deploy --config dist/server/wrangler.json
```

The build script normalizes the generated D1 binding to `../../drizzle`, pointing from `dist/server/` to the repository's `drizzle` migration directory. Check that its resolved path in the generated config points to this checkout's `drizzle/`, and run commands from the repository root. Do not use `drizzle-kit push` against production or repeatedly execute individual migration SQL files outside migration tracking.

For an existing database, export and retain a backup before schema changes:

```sh
pnpm exec wrangler d1 export DB --remote --output commonplace-before-migration.sql --config dist/server/wrangler.json
```

Store that export securely; it can include private operational records. D1 migration tracking and Drizzle's own history use different metadata: do not apply the full sequence to a previously initialized database without reconciling the baseline. Existing entries must remain present and migrate as published; new entries publish immediately after spam checks. Any existing pending entries stay pending until an owner decides. Rehearse on a separate database, compare counts/statuses, verify receipts where available, and define rollback/restore before touching live data. An old Worker binary may not be compatible after a schema change.

Moving existing live Site data is a separate owner-approved operation: obtain an authorized export, back it up, rehearse import into the new account, preserve entry IDs and receipt hashes, verify public counts and moderation statuses, then choose cutover timing. These instructions do not authorize or perform that transfer.

## 7. Verify the final deployment

Visit the canonical hostname and check public pages without login. Open `/admin` and confirm Access prompts for the owner; test an unauthorized identity and confirm denial. Verify unauthenticated `/api/admin/*` requests cannot mutate anything and owner actions write audit events. Check readiness on the owner dashboard.

Publish a real challenge-backed entry: it should publish immediately and appear in public lists, feed, detail URLs and sitemap. Existing pending entries must remain private until an owner publishes them. Verify local receipt status, reports, hiding/restoring, stale-version conflict handling and global posting pause. Review failed challenges/rate limits without storing raw IP addresses. Do not declare launch complete while readiness reports missing configuration.

When adding a custom domain later, configure DNS/Workers routing and HTTPS, add the hostname to the same Access application and Turnstile widget, update `SITE_URL`, rebuild, and redeploy. Verify the final canonical links and protection again before redirecting visitors from another hostname.

## Official references

- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Wrangler D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Access application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Access self-hosted applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Turnstile hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/)
