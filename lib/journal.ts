import {env} from 'cloudflare:workers';
export type Entry={id:string;title:string;body:string;category:string;createdAt:number};
export const PAGE_SIZE=30;
const publicFields='id,title,body,category,created_at AS createdAt';
export async function getEntriesPage(page=1){
 const [rows,count]=await Promise.all([
  env.DB!.prepare(`SELECT ${publicFields} FROM entries ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(PAGE_SIZE,(page-1)*PAGE_SIZE).all<Entry>(),
  env.DB!.prepare('SELECT COUNT(*) AS total FROM entries').first<{total:number}>()
 ]);
 const total=count?.total||0;
 return {entries:rows.results,total,hasMore:page*PAGE_SIZE<total};
}
export async function getEntry(id:string){
 if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id))return null;
 return env.DB!.prepare(`SELECT ${publicFields} FROM entries WHERE id=?`).bind(id).first<Entry>();
}
