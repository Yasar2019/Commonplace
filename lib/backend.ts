import {getPublicPage} from './public-store.ts';
import {z} from 'zod';
import {type SecurityConfig,ApiError,fail,canonicalOrigin,assertJsonRequest,readJson,sha256,networkKey,consumeQuota,verifyTurnstile,verifyAdmin,cookie,json,hasRealTurnstile,adminConfigured} from './security.ts';
export type Runtime=SecurityConfig&{DB?:D1Database};
type Dependencies={fetcher?:typeof fetch;adminChecker?:typeof verifyAdmin;now?:()=>number};
const publicFields='id,title,body,category,created_at AS createdAt';
const ownedFields=publicFields+',status,version';
const entryInput=z.object({title:z.string().trim().max(120),body:z.string().trim().min(10).max(5000),category:z.enum(['Thoughts','Stories','Poetry']),website:z.string().nullable().optional(),turnstileToken:z.string().min(1).max(2048)});
const receipt=z.object({id:z.string().uuid(),token:z.string().uuid()});
const reasons=z.enum(['Spam','Harassment or hate','Private information','Other harmful content']);
function db(env:Runtime){if(!env.DB)fail(503,'Journal storage is unavailable.');return env.DB}
function parse<T extends z.ZodTypeAny>(schema:T,value:unknown):z.infer<T>{const result=schema.safeParse(value);if(!result.success)fail(400,'Please check the form and try again.');return result.data}
function now(deps:Dependencies){return deps.now?.()??Date.now()}
async function requireOwner(request:Request,env:Runtime,deps:Dependencies){return (deps.adminChecker||verifyAdmin)(request.headers,env)}
async function networkQuota(request:Request,env:Runtime,kind:string,limit:number,seconds:number,time=Date.now()){
 assertJsonRequest(request);
 if(new URL(request.url).origin!==canonicalOrigin(env))fail(403,'Please use the journal’s canonical address.');
 const key=await networkKey(request,env,time);await consumeQuota(db(env),kind+':'+key,limit,seconds,time);return key;
}
export async function isPaused(env:Runtime){return (await db(env).prepare("SELECT value FROM settings WHERE key='posting_paused'").first<{value:string}>())?.value==='true'}
export async function securityConfig(env:Runtime){let originReady=false;try{canonicalOrigin(env);originReady=true}catch{}return json({siteKey:env.TURNSTILE_SITE_KEY||'',postingPaused:await isPaused(env),ready:originReady&&adminConfigured(env)&&hasRealTurnstile(env)&&!!env.RATE_LIMIT_SECRET&&env.RATE_LIMIT_SECRET.length>=32})}
export async function publicEntries(request:Request,env:Runtime){
 const raw=new URL(request.url).searchParams.get('page')||'1';const page=/^\d+$/.test(raw)?Math.min(100000,Math.max(1,Number(raw))):1;
 return json(await getPublicPage(db(env),page));
}
export async function submitEntry(request:Request,env:Runtime,deps:Dependencies={}){
 const time=now(deps);await networkQuota(request,env,'publish-short',5,600,time);await networkQuota(request,env,'publish-day',20,86400,time);
 if(!adminConfigured(env))fail(503,'Moderation is not configured yet. Please return later.');
 const data=parse(entryInput,await readJson(request));if(data.website)fail(400,'Unable to accept this submission.');if(await isPaused(env))fail(503,'New entries are paused while we care for the journal. Please return later.');
 if((data.body.match(/https?:\/\//gi)||[]).length>2)fail(400,'Please include no more than two links.');
 await verifyTurnstile(data.turnstileToken,'publish',env,deps.fetcher);
 const writer=cookie(request,'journal_writer'),token=crypto.randomUUID(),id=crypto.randomUUID();
 const hash=await sha256(data.body.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim());
 const result=await db(env).prepare(`INSERT INTO entries(id,title,body,category,created_at,author,delete_hash,status,version,content_hash,last_action_id)
 SELECT ?,?,?,?,?,?,?,'published',0,?,'' WHERE NOT EXISTS(SELECT 1 FROM entries WHERE author=? AND created_at>?)
 AND NOT EXISTS(SELECT 1 FROM entries WHERE content_hash=? AND created_at>?)
 AND NOT EXISTS(SELECT 1 FROM settings WHERE key='posting_paused' AND value='true')`).bind(id,data.title,data.body,data.category,time,writer,await sha256(token),hash,writer,time-60000,hash,time-86400000).run();
 if(!result.meta.changes){if(await isPaused(env))fail(503,'New entries are paused. Please return later.');const duplicate=await db(env).prepare('SELECT id FROM entries WHERE content_hash=? AND created_at>?').bind(hash,time-86400000).first();if(duplicate)fail(409,'An identical entry was recently submitted. Please leave something original.');fail(429,'Please wait a minute before submitting another entry.')}
 return json({entry:{id,title:data.title,body:data.body,category:data.category,createdAt:time,status:'published'},deleteToken:token},201,{'Set-Cookie':`journal_writer=${writer}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`});
}
export async function reportEntry(request:Request,env:Runtime,deps:Dependencies={}){
 const time=now(deps),reporter=await networkQuota(request,env,'report',10,3600,time);
 const data=parse(z.object({id:z.string().uuid(),reason:reasons,turnstileToken:z.string().min(1).max(2048)}),await readJson(request));
 const exists=await db(env).prepare("SELECT id FROM entries WHERE id=? AND status='published'").bind(data.id).first();if(!exists)fail(404,'Entry not found.');
 await verifyTurnstile(data.turnstileToken,'report',env,deps.fetcher);
 await db(env).prepare("INSERT OR IGNORE INTO reports(id,entry_id,reporter,reason,created_at,status,last_action_id) SELECT ?,?,?,?,?,'open','' WHERE EXISTS(SELECT 1 FROM entries WHERE id=? AND status='published')").bind(crypto.randomUUID(),data.id,reporter,data.reason,time,data.id).run();return json({ok:true});
}
export async function deleteEntry(request:Request,env:Runtime){
 await networkQuota(request,env,'delete',20,3600);const data=parse(receipt,await readJson(request));const auditId=crypto.randomUUID();
 const results=await db(env).batch([
  db(env).prepare('DELETE FROM entries WHERE id=? AND delete_hash=? RETURNING id').bind(data.id,await sha256(data.token)),
  db(env).prepare("INSERT INTO moderation_audit(id,entry_id,action,actor,reason,created_at) SELECT ?,?,'author_delete','anonymous','Deleted using the browser receipt',? WHERE changes()=1").bind(auditId,data.id,Date.now()),
  db(env).prepare('DELETE FROM reports WHERE entry_id=? AND NOT EXISTS(SELECT 1 FROM entries WHERE id=?)').bind(data.id,data.id)
 ]);
 if(!results[0].meta.changes)fail(403,'This deletion receipt is no longer valid.');return json({ok:true});
}
export async function myEntries(request:Request,env:Runtime){
 await networkQuota(request,env,'receipts',60,600);const data=parse(z.object({receipts:z.array(receipt).max(50)}),await readJson(request));if(!data.receipts.length)return json({entries:[]});
 const results=await db(env).batch(await Promise.all(data.receipts.map(async r=>db(env).prepare(`SELECT ${ownedFields} FROM entries WHERE id=? AND delete_hash=?`).bind(r.id,await sha256(r.token)))));return json({entries:results.flatMap(r=>r.results||[])});
}
const mutation=z.discriminatedUnion('type',[
 z.object({type:z.literal('entry'),id:z.string().uuid(),version:z.number().int().min(0),action:z.enum(['publish','hide','reject']),reason:z.string().trim().max(600).default('')}),
 z.object({type:z.literal('report'),id:z.string().uuid(),action:z.enum(['resolve','dismiss']),reason:z.string().trim().max(600).default('')}),
 z.object({type:z.literal('settings'),postingPaused:z.boolean(),reason:z.string().trim().max(600).default('')})
]);
export async function adminMutate(request:Request,env:Runtime,deps:Dependencies={}){
 const actor=await requireOwner(request,env,deps);if(new URL(request.url).origin!==canonicalOrigin(env))fail(403,'Invalid journal origin.');const data=parse(mutation,await readJson(request));const time=now(deps),actionId=crypto.randomUUID();
 if(data.type==='entry'){
  if(data.action!=='publish'&&!data.reason)fail(400,'Please record a moderation reason.');
  const status={publish:'published',hide:'hidden',reject:'rejected'}[data.action];
  const results=await db(env).batch([
   db(env).prepare('UPDATE entries SET status=?,version=version+1,last_action_id=? WHERE id=? AND version=? RETURNING id').bind(status,actionId,data.id,data.version),
   db(env).prepare('INSERT INTO moderation_audit(id,entry_id,action,actor,reason,created_at) SELECT ?,id,?,?,?,? FROM entries WHERE id=? AND last_action_id=?').bind(actionId,data.action,actor.email,data.reason,time,data.id,actionId)
  ]);if(!results[0].meta.changes)fail(409,'This entry changed or was removed. Refresh the queue before trying again.');
 }else if(data.type==='report'){
  const status=data.action==='resolve'?'resolved':'dismissed';const results=await db(env).batch([
   db(env).prepare("UPDATE reports SET status=?,last_action_id=? WHERE id=? AND status='open' RETURNING id").bind(status,actionId,data.id),
   db(env).prepare('INSERT INTO moderation_audit(id,entry_id,action,actor,reason,created_at) SELECT ?,entry_id,?,?,?,? FROM reports WHERE id=? AND last_action_id=?').bind(actionId,'report_'+data.action,actor.email,data.reason,time,data.id,actionId)
  ]);if(!results[0].meta.changes)fail(409,'This report was already reviewed or removed.');
 }else{
  await db(env).batch([
   db(env).prepare("INSERT INTO settings(key,value) VALUES('posting_paused',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(data.postingPaused)),
   db(env).prepare('INSERT INTO moderation_audit(id,entry_id,action,actor,reason,created_at) VALUES(?,NULL,?,?,?,?)').bind(actionId,data.postingPaused?'pause_posting':'resume_posting',actor.email,data.reason,time)
  ]);
 }
 return json({ok:true});
}
export async function adminRead(request:Request,env:Runtime,deps:Dependencies={}){
 await requireOwner(request,env,deps);const url=new URL(request.url),view=url.searchParams.get('view')||'reported';if(!['pending','reported','published','hidden','rejected','audit','settings'].includes(view))fail(400,'Unknown dashboard view.');
 const raw=url.searchParams.get('page')||'1';const page=/^\d+$/.test(raw)?Math.max(1,Math.min(100000,Number(raw))):1;const search=(url.searchParams.get('q')||'').slice(0,120);const pattern='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
 const counts={pending:0,published:0,reported:0,hidden:0,rejected:0};const grouped=await db(env).prepare('SELECT status,COUNT(*) AS n FROM entries GROUP BY status').all<{status:string;n:number}>();for(const row of grouped.results)if(row.status in counts)counts[row.status as keyof typeof counts]=row.n;
 counts.reported=(await db(env).prepare("SELECT COUNT(DISTINCT entry_id) AS n FROM reports WHERE status='open'").first<{n:number}>())?.n||0;
 const readiness={turnstile:hasRealTurnstile(env),rateLimit:!!env.RATE_LIMIT_SECRET&&env.RATE_LIMIT_SECRET.length>=32,admin:adminConfigured(env)};const common={counts,page,postingPaused:await isPaused(env),readiness};
 if(view==='settings')return json({...common,entries:[],reports:[],audit:[],total:0});
 if(view==='audit'){
  const match="(action LIKE ? ESCAPE '\\' OR actor LIKE ? ESCAPE '\\' OR reason LIKE ? ESCAPE '\\')";
  const result=await db(env).prepare(`SELECT id,entry_id AS entryId,action,actor,reason,created_at AS createdAt FROM moderation_audit WHERE ${match} ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET ?`).bind(pattern,pattern,pattern,(page-1)*20).all();
  const total=(await db(env).prepare(`SELECT COUNT(*) AS n FROM moderation_audit WHERE ${match}`).bind(pattern,pattern,pattern).first<{n:number}>())?.n||0;
  return json({...common,entries:[],reports:[],audit:result.results,total});
 }
 const where=view==='reported'?"EXISTS(SELECT 1 FROM reports r WHERE r.entry_id=e.id AND r.status='open')":'e.status=?';const binds=view==='reported'?[]:[view];const clause=where+" AND (e.title LIKE ? ESCAPE '\\' OR e.body LIKE ? ESCAPE '\\')";
 const rows=await db(env).prepare(`SELECT e.id,e.title,e.body,e.category,e.created_at AS createdAt,e.status,e.version,(SELECT COUNT(*) FROM reports r WHERE r.entry_id=e.id AND r.status='open') AS reportCount FROM entries e WHERE ${clause} ORDER BY e.created_at DESC,e.id DESC LIMIT 20 OFFSET ?`).bind(...binds,pattern,pattern,(page-1)*20).all<{id:string}>();
 const total=(await db(env).prepare(`SELECT COUNT(*) AS n FROM entries e WHERE ${clause}`).bind(...binds,pattern,pattern).first<{n:number}>())?.n||0;
 const ids=rows.results.map(e=>e.id);const reports=ids.length?(await db(env).prepare(`SELECT id,entry_id AS entryId,reason,created_at AS createdAt,status FROM reports WHERE status='open' AND entry_id IN (${ids.map(()=>'?').join(',')}) ORDER BY created_at DESC`).bind(...ids).all()).results:[];
 return json({...common,entries:rows.results,reports,audit:[],total});
}
