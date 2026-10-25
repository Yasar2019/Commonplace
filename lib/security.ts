import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';
export type SecurityConfig={SITE_URL?:string;TURNSTILE_SITE_KEY?:string;TURNSTILE_SECRET?:string;RATE_LIMIT_SECRET?:string;ADMIN_EMAILS?:string;ACCESS_TEAM_DOMAIN?:string;ACCESS_AUD?:string};
export class ApiError extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status}}
export function fail(status:number,message:string):never{throw new ApiError(status,message)}
export function canonicalOrigin(config:SecurityConfig){try{const url=new URL(config.SITE_URL||'');if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error();return url.origin}catch{return fail(503,'The journal needs its security configuration before accepting requests.')}}
export function assertJsonRequest(req:Request){
 const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin||req.headers.get('sec-fetch-site')==='cross-site')fail(403,'Please use the journal to submit this request.');
 if(req.headers.get('content-type')?.split(';')[0].trim()!=='application/json')fail(415,'A JSON request is required.');
}
export async function readJson(req:Request,limit=32000){
 assertJsonRequest(req);
 if(Number(req.headers.get('content-length'))>limit)fail(413,'This request is too large.');
 const reader=req.body?.getReader();if(!reader)fail(400,'Missing request body.');let length=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();fail(413,'This request is too large.')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown}catch{return fail(400,'Invalid JSON request.')}
}
export async function sha256(value:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
function hex(buffer:ArrayBuffer){return Array.from(new Uint8Array(buffer)).map(b=>b.toString(16).padStart(2,'0')).join('')}
export function hasRealTurnstile(config:SecurityConfig){return !!config.TURNSTILE_SITE_KEY&&!!config.TURNSTILE_SECRET&&![config.TURNSTILE_SITE_KEY,config.TURNSTILE_SECRET].some(v=>/^[123]x0{10,}/.test(v||''))}
export async function verifyTurnstile(token:string,action:'publish'|'report',config:SecurityConfig,fetcher:typeof fetch=fetch){
 const origin=canonicalOrigin(config);if(!hasRealTurnstile(config))fail(503,'Bot protection is not configured yet.');if(!token||token.length>2048)fail(403,'Please complete the verification and try again.');
 let result:{success?:boolean;action?:string;hostname?:string};
 try{const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:config.TURNSTILE_SECRET,response:token}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error();result=await response.json() as typeof result}catch{return fail(503,'Verification is temporarily unavailable. Please try again.')}
 if(result.success!==true||result.action!==action||result.hostname!==new URL(origin).hostname)fail(403,'Verification failed or expired. Please try again.');
}
export async function networkKey(req:Request,config:SecurityConfig,now=Date.now()){
 if(!config.RATE_LIMIT_SECRET||config.RATE_LIMIT_SECRET.length<32)fail(503,'Spam protection is not configured yet.');
 const ip=req.headers.get('cf-connecting-ip');if(!ip||ip.length>64)fail(503,'The trusted network identity is unavailable.');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(config.RATE_LIMIT_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${Math.floor(now/86400000)}:${ip}`)));
}
export async function consumeQuota(db:D1Database,key:string,limit:number,seconds:number,now=Date.now()){
 const slot=Math.floor(now/(seconds*1000));const id=`${key}:${seconds}:${slot}`;
 const row=await db.prepare('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(id,(slot+1)*seconds*1000+86400000,limit).first();
 if(!row)fail(429,'Too many requests. Please take a break and try again later.');
 await db.prepare('DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at<? LIMIT 200)').bind(now).run();
}
export function adminConfigured(config:SecurityConfig){return !!config.ACCESS_AUD&&!!config.ADMIN_EMAILS?.trim()&&/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.ACCESS_TEAM_DOMAIN||'')}
const jwksCache=new Map<string,JWTVerifyGetKey>();
export async function verifyAdmin(headers:Headers,config:SecurityConfig,keySet?:JWTVerifyGetKey){
 if(!adminConfigured(config))fail(503,'Owner authentication is not configured.');const token=headers.get('cf-access-jwt-assertion');if(!token)fail(403,'Owner sign-in is required.');
 const issuer=config.ACCESS_TEAM_DOMAIN!;let jwks=keySet||jwksCache.get(issuer);if(!jwks){jwks=createRemoteJWKSet(new URL(issuer+'/cdn-cgi/access/certs'),{timeoutDuration:5000});jwksCache.set(issuer,jwks)}
 try{const {payload}=await jwtVerify(token,jwks,{issuer,audience:config.ACCESS_AUD,algorithms:['RS256']});const email=typeof payload.email==='string'?payload.email.toLowerCase():'';const allowed=config.ADMIN_EMAILS!.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);if(!payload.sub||!payload.exp||!email||!allowed.includes(email))throw Error();return {id:payload.sub,email}}catch{return fail(403,'This account is not authorized to moderate the journal.')}
}
export function cookie(req:Request,name:string){const value=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);return value&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value)?value:crypto.randomUUID()}
export const json=(value:unknown,status=200,headers:Record<string,string>={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',...headers}});
export async function api(action:()=>Promise<Response>){try{return await action()}catch(error){if(error instanceof ApiError)return json({error:error.message},error.status,error.status===429?{'Retry-After':'60'}:{});console.error('Journal operation failed:',error instanceof Error?error.name:'Unknown error');return json({error:'The journal is temporarily unavailable. Please try again.'},503)}}
