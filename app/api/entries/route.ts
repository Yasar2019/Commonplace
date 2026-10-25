import { z } from 'zod';
import { env } from 'cloudflare:workers';
const json = (body: unknown, status=200, extra={}) => Response.json(body,{status,headers:{'Cache-Control':'no-store',...extra}});
async function hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('')}
function author(req:Request){return req.headers.get('cookie')?.match(/(?:^|; )journal_writer=([a-f0-9-]{36})/)?.[1] || crypto.randomUUID()}
function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin}
export async function GET(req:Request){
 const url=new URL(req.url); const before=Number(url.searchParams.get('before'))||Date.now()+1;
 const result=await env.DB!.prepare('SELECT id,title,body,category,created_at AS createdAt FROM entries WHERE created_at < ? ORDER BY created_at DESC,id DESC LIMIT 31').bind(before).all();
 const count=await env.DB!.prepare('SELECT COUNT(*) AS total FROM entries').first();
 return json({entries:result.results.slice(0,30),hasMore:result.results.length>30,total:count?.total||0});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Please publish from the journal.'},403);
 if(Number(req.headers.get('content-length'))>30000)return json({error:'This entry is too long.'},413);
 const parsed = z.object({title:z.string().max(120),body:z.string().max(5000),category:z.enum(['Thoughts','Stories','Poetry']),website:z.string().nullable().optional()}).safeParse(await req.json().catch(()=>null)); if(!parsed.success)return json({error:'Please check your entry (maximum 5,000 characters).'},400); const data=parsed.data;
 if(data.website)return json({error:'Unable to publish.'},400);
 const title=typeof data.title==='string'?data.title.trim():''; const body=typeof data.body==='string'?data.body.trim():'';
 if(title.length>120||body.length<10||body.length>5000||!['Thoughts','Stories','Poetry'].includes(data.category))return json({error:'Write 10–5,000 characters and choose a category. Titles may be up to 120 characters.'},400);
 if((body.match(/https?:\/\//g)||[]).length>2)return json({error:'Please include no more than two links.'},400);
 const writer=author(req); const now=Date.now();const token=crypto.randomUUID();const id=crypto.randomUUID();
 const result=await env.DB!.prepare('INSERT INTO entries (id,title,body,category,created_at,author,delete_hash) SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM entries WHERE author=? AND created_at>?)').bind(id,title,body,data.category,now,writer,await hash(token),writer,now-60000).run();
 if(!result.meta.changes)return json({error:'Take a breath. You can publish another entry in a minute.'},429);
 return json({entry:{id,title,body,category:data.category,createdAt:now},deleteToken:token},201,{'Set-Cookie':`journal_writer=${writer}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`});
}
export async function DELETE(req:Request){
 if(!sameOrigin(req))return json({error:'Invalid request.'},403);
 const parsed=z.object({id:z.string().uuid(),token:z.string().uuid()}).safeParse(await req.json().catch(()=>null));if(!parsed.success)return json({error:'Invalid request.'},400);const data=parsed.data;
 if(typeof data.token!=='string'||typeof data.id!=='string')return json({error:'Missing deletion receipt.'},400);
 const result=await env.DB!.prepare('DELETE FROM entries WHERE id=? AND delete_hash=?').bind(data.id,await hash(data.token)).run();
 return result.meta.changes?json({ok:true}):json({error:'This deletion receipt is no longer valid.'},403);
}
