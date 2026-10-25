# Commonplace

An open, anonymous journal for thoughts, personal stories, and poetry. Anyone can read and publish without a posting account or email address.

**Live site:** https://commonplace-open-journal.carlos-nazzarian.chatgpt.site/

## Features

- Public, dated entries with optional titles and categories
- Server-rendered journal and permanent entry pages
- Search within the current page and category filters
- Browser-local drafts and deletion receipts for your own entries
- Owner moderation dashboard with pending/reported/published/hidden/rejected queues, audit trail and posting pause
- Verified Cloudflare Access owner authentication, required server-validated Turnstile, atomic per-network quotas, duplicate detection, and bounded requests
- Private receipt-based submission status and self-deletion
- Canonical URLs, social preview metadata, typed JSON-LD, sitemap index, robots.txt, and RSS
- Responsive layout, self-hosted fonts, and privacy/community pages

## Stack

React 19, TypeScript, Vinext, Cloudflare Workers and D1, Drizzle, next-seo 7.3.0, and schema-dts 2.1.0.

This is a full-stack app. GitHub Pages alone cannot run its posting API or D1 database. GitHub stores the source; the live site remains hosted through Sites on Cloudflare Workers.

## Local development

Use Node.js 22.13 or newer and pnpm 11.25.0 (the version in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nasty_layla_miller.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_nosy_the_professor.sql
pnpm dev
```

Open the URL printed by the development server. Local D1 data is separate from production. Apply each migration once, in order. The default clean-clone execution profile is portable; no private workspace paths or runtime credentials are needed to develop locally.

## Verification

The test suite uses Node's built-in TypeScript support; run tests with Node.js 24 or newer.

```sh
node --test tests/*.test.mjs
pnpm exec tsc --noEmit
pnpm build
python3 scripts/check-public-seo.py https://commonplace-open-journal.carlos-nazzarian.chatgpt.site
```

The Python smoke check requires `curl` and only reads public pages. It does not create posts.

## Database and deployment

- `db/schema.ts`: schema definitions
- `drizzle/`: immutable generated migrations
- `app/api/`: publishing, deletion, and reporting endpoints
- `.openai/hosting.json`: existing Sites project identity and D1 binding
- `docs/framework-development.md`: detailed runtime and migration notes

Production deployments use the Sites workflow. A GitHub push does not automatically deploy the live site. Keep the existing Sites project ID when updating this deployment. Search metadata uses the live origin in `lib/seo.ts`; change that if you move to another domain.

Never commit `.env` files, runtime secrets, `.wrangler`, `.sites-runtime`, `node_modules`, `dist`, or database contents. Public entry data is not part of this source repository.

## Moderation release and Cloudflare setup

This source release adds moderation and stronger spam protection. It is prepared for deployment to your own Cloudflare account. The existing live Site remains on the previous release until a separate migration and cutover.

Read **[the Cloudflare deployment guide](docs/CLOUDFLARE_DEPLOYMENT.md)** before hosting. It covers D1, Access owner-only paths, Turnstile, runtime secrets, migrations, backups, deployment, and a future custom domain. Start with `cloudflare.example.json`; the filled `cloudflare.config.json` stays ignored.

```sh
pnpm check:cloudflare
pnpm build:cloudflare
```

New submissions enter **pending review**. Existing entries migrate as **published**. Pending, hidden and rejected entries are excluded from all public surfaces. Owners use `/admin`; visitors use `/my-entries` with their browser's deletion receipts. Moderator entry actions are reversible; author deletion is permanent and does not remove copies held outside this service.

Security is enabled by configuration, never by a development bypass: missing Access configuration, trusted network metadata, Turnstile settings or rate-limit secret blocks protected operations. Normal local pages remain readable, but posting/admin access stays unavailable until configured. Real Cloudflare credentials and end-to-end checks on the final hostname are required before opening submissions. No claims of immunity to all spam or production load testing are made.

`drizzle/0001_nosy_the_professor.sql` is an additive migration. Preserve previous migrations; do not reinitialize an existing database. The SQLite-backed security/state tests use Node 24+ and run with `pnpm test`.

Anonymous means no author name is displayed; infrastructure providers still receive technical requests. Public entries may appear in search engines. Search Console ownership verification and sitemap submission remain owner setup tasks.

## Third-party licenses

Font licenses are included under `public/fonts/`. The vendored Sites Vite integration retains its upstream license under `scripts/vite/`.
