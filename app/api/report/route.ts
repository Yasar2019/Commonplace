import { z } from 'zod';
import { env } from 'cloudflare:workers';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request.'},{status:403});
 const parsed=z.object({id:z.string().uuid(),reason:z.enum(['Spam','Harassment or hate','Private information','Other harmful content'])}).safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:'Invalid report.'},{status:400});const d=parsed.data;
 const reporter=req.headers.get('cookie')?.match(/(?:^|; )journal_reader=([a-f0-9-]{36})/)?.[1]||crypto.randomUUID();
 if(!['Spam','Harassment or hate','Private information','Other harmful content'].includes(d.reason)||typeof d.id!=='string')return Response.json({error:'Choose a reason.'},{status:400});
 const existing=await env.DB!.prepare('SELECT id FROM entries WHERE id=?').bind(d.id).first();
 if(!existing)return Response.json({error:'Entry not found.'},{status:404});
 await env.DB!.prepare('INSERT OR IGNORE INTO reports(id,entry_id,reporter,reason,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),d.id,reporter,d.reason,Date.now()).run();
 return Response.json({ok:true},{headers:{'Set-Cookie':`journal_reader=${reporter}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`}});
}
