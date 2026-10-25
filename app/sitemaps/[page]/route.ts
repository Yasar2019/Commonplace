import {env} from 'cloudflare:workers';
import {SITE_URL,xml} from '../../../lib/seo';
export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{page:string}>}){
 const value=(await params).page;if(!/^\d+\.xml$/.test(value))return new Response('Not found',{status:404});const page=Number(value.slice(0,-4));if(!Number.isSafeInteger(page)||page>100000)return new Response('Not found',{status:404});
 const rows=await env.DB!.prepare('SELECT id,created_at FROM entries ORDER BY created_at DESC,id DESC LIMIT 1000 OFFSET ?').bind(page*1000).all<{id:string;created_at:number}>();if(page>0&&!rows.results.length)return new Response('Not found',{status:404});
 const staticUrls=page===0?['/','/about','/privacy','/guidelines'].map(path=>`<url><loc>${SITE_URL}${path}</loc></url>`).join(''):'';
 const urls=rows.results.map(e=>`<url><loc>${xml(SITE_URL+'/entry/'+e.id)}</loc><lastmod>${new Date(e.created_at).toISOString()}</lastmod></url>`).join('');
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${urls}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
