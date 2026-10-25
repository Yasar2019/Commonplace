declare namespace Cloudflare {
 interface Env {
  DB?:D1Database;BUCKET?:R2Bucket;
  SITE_URL?:string;TURNSTILE_SITE_KEY?:string;TURNSTILE_SECRET?:string;RATE_LIMIT_SECRET?:string;
  ADMIN_EMAILS?:string;ACCESS_TEAM_DOMAIN?:string;ACCESS_AUD?:string;
 }
}
