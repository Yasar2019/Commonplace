import {getPublicCount} from '../../lib/public-store';
import {env} from 'cloudflare:workers';
import {SITE_URL,xml} from '../../lib/seo';
export const dynamic='force-dynamic';
export async function GET(){const total=await getPublicCount(env.DB!);const chunks=Math.max(1,Math.ceil(total/1000));const urls=Array.from({length:chunks},(_,i)=>`<sitemap><loc>${xml(SITE_URL)}/sitemaps/${i}.xml</loc></sitemap>`).join('');return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</sitemapindex>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}})}
