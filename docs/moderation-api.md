# Moderation API contract

All JSON, no-store. Anonymous mutation errors: `{error:string}`, HTTP 400/403/409/413/429/503. Public actions same-origin JSON only. Framework server wrappers supply `env.DB` to portable services.

## Public
- GET /api/security/config -> `{siteKey:string,postingPaused:boolean,ready:boolean}` (never secrets). Action values `publish` and `report`.
- POST /api/entries body `{title,body,category,website?,turnstileToken}` -> 201 `{entry:{id,title,body,category,createdAt,status:'pending'},deleteToken}`. Do not insert pending entry into public stream.
- DELETE /api/entries body `{id,token}` -> `{ok:true}`.
- POST /api/report `{id,reason,turnstileToken}` reason existing enum -> `{ok:true}`.
- POST /api/my-entries `{receipts:[{id,token}]}` max50 -> `{entries:[{id,title,body,category,createdAt,status,version}]}`. Only correct receipts returned.
- GET /api/entries?page=1 -> existing public list contract `{entries,total,hasMore}`, only published.

## Owner (verified Cloudflare Access JWT and env ADMIN_EMAILS allowlist)
- GET /api/admin?view=pending|reported|published|hidden|rejected|audit|settings&page=1&q=... -> `{entries:AdminEntry[],reports:AdminReport[],audit:AuditEvent[],total:number,page:number,counts:{pending:number,published:number,reported:number,hidden:number,rejected:number},postingPaused:boolean,readiness:{turnstile:boolean,rateLimit:boolean,admin:boolean}}`.
- AdminEntry `{id,title,body,category,createdAt,status,version,reportCount}`; no private identity/hash fields.
- AdminReport `{id,entryId,reason,createdAt,status}` (open reports only, for loaded entries).
- AuditEvent `{id,entryId:string|null,action,actor,reason,createdAt}`.
- POST /api/admin body discriminated union:
  - `{type:'entry',id,version:number,action:'publish'|'hide'|'reject',reason:string}` reason required for hide/reject; publish supports restore. -> `{ok:true}` or 409 stale; soft actions only.
  - `{type:'report',id,action:'resolve'|'dismiss',reason:string}` -> `{ok:true}`.
  - `{type:'settings',postingPaused:boolean,reason:string}` -> `{ok:true}`.

Admin server page verifies access before rendering Dashboard; Dashboard is a client component exported default from app/admin/Dashboard.tsx with no props, fetching GET /api/admin. Gate UI shows restricted access and no content. All admin data authorization remains server side. Administrative data never appears on public pages.
