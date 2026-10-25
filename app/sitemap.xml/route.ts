import {env} from 'cloudflare:workers';
import {SITE_URL,xml} from '../../lib/seo';
export const dynamic='force-dynamic';
export async function GET(){const row=await env.DB!.prepare('SELECT COUNT(*) AS total FROM entries').first<{total:number}>();const chunks=Math.max(1,Math.ceil((row?.total||0)/1000));const urls=Array.from({length:chunks},(_,i)=>`<sitemap><loc>${xml(SITE_URL)}/sitemaps/${i}.xml</loc></sitemap>`).join('');return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</sitemapindex>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}})}
