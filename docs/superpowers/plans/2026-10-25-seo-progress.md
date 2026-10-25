# SEO implementation verification
Plan: docs/superpowers/plans/2026-10-25-seo.md
- Tasks 1 and 2 implemented; public-field projections preserve anonymity.
- Ruling: continue inline under the user’s prior “choose for me and build” instruction; do not add another design approval gate.
- Verified npm registry releases next-seo 7.3.0 and schema-dts 2.1.0.
- 11 Node tests pass, including pagination parsing, XML safety, script-closure variants and consistent UTC publication dates.
- Independent review found package JSON-LD escaping, XML controls and timezone consistency issues. Fixed all three; focused reviewer recheck passed all 11 tests.
- next-seo is used for schema processors; its script renderer is intentionally not used for untrusted text. Own serializer escapes every less-than character.
- Self-hosted licensed fonts, social card and new favicon included.
- Browser preview checked permanent entry pages, parsed schema, sitemap index and sitemap chunk. Initial HTML/status checks also run against publication with scripts/check-public-seo.py.
- Remaining launch limits: stronger abuse controls, moderation dashboard/operations, owner Search Console verification. No ranking or audience guarantees.

Live version 2 verified: canonical/OG/Twitter metadata, information pages, robots, sitemap index/chunk, RSS, 1200×630 social card, 404s for malformed and absent entries, and actual public entry HTML/schema. Root canonical normalizes away its trailing slash in Vinext; the smoke check accepts equivalent root URLs. No production test posts were created.
