# Commonplace

An open, anonymous journal for thoughts, personal stories, and poetry. Anyone can read and publish without a posting account or email address.

**Live site:** https://commonplace-open-journal.carlos-nazzarian.chatgpt.site/

## Features

- Public, dated entries with optional titles and categories
- Server-rendered journal and permanent entry pages
- Search within the current page and category filters
- Browser-local drafts and deletion receipts for your own entries
- Basic posting limits, honeypot protection, and reporting
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

## Public beta limitations

Reports are stored, but there is no moderation dashboard yet. Posting limits currently depend on anonymous cookies and can be bypassed. Add stronger abuse controls and operational moderation before broad promotion. Search Console ownership verification and sitemap submission are also still required for monitoring discovery.

Anonymous means no author name is displayed; it does not guarantee untraceability. Posts are public and may appear in search engines. Browser deletion receipts can be lost if local storage is cleared. See the live privacy and community pages for the current behavior.

## Third-party licenses

Font licenses are included under `public/fonts/`. The vendored Sites Vite integration retains its upstream license under `scripts/vite/`.
