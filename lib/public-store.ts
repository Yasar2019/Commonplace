import type {Entry} from './journal.ts';
const fields='id,title,body,category,created_at AS createdAt';
export async function getPublicCount(db:D1Database){return (await db.prepare("SELECT COUNT(*) AS total FROM entries WHERE status='published'").first<{total:number}>())?.total||0}
export async function getPublicPage(db:D1Database,page=1){const rows=await db.prepare(`SELECT ${fields} FROM entries WHERE status='published' ORDER BY created_at DESC,id DESC LIMIT 30 OFFSET ?`).bind((page-1)*30).all<Entry>();const total=await getPublicCount(db);return {entries:rows.results,total,hasMore:page*30<total}}
export async function getPublicEntry(db:D1Database,id:string){if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id))return null;return db.prepare(`SELECT ${fields} FROM entries WHERE id=? AND status='published'`).bind(id).first<Entry>()}
export async function getFeedEntries(db:D1Database){return (await db.prepare(`SELECT ${fields} FROM entries WHERE status='published' ORDER BY created_at DESC,id DESC LIMIT 50`).all<Entry>()).results}
export async function getSitemapEntries(db:D1Database,page:number){return (await db.prepare("SELECT id,created_at FROM entries WHERE status='published' ORDER BY created_at DESC,id DESC LIMIT 1000 OFFSET ?").bind(page*1000).all<{id:string;created_at:number}>()).results}
