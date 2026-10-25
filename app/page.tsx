import type {Metadata} from 'next';
import type {WithContext,WebSite} from 'schema-dts';
import {notFound} from 'next/navigation';
import Journal from './Journal';
import {getEntriesPage} from '../lib/journal';
import {SITE_URL,SITE_DESCRIPTION,parsePage,pageUrl,jsonLd} from '../lib/seo';
export const dynamic='force-dynamic';
type Props={searchParams:Promise<{page?:string}>};
export async function generateMetadata({searchParams}:Props):Promise<Metadata>{const page=parsePage((await searchParams).page);return {title:page===1?'Anonymous Journal — Thoughts, Stories & Poetry | Commonplace':`Journal — Page ${page} | Commonplace`,description:SITE_DESCRIPTION,alternates:{canonical:pageUrl(page)},openGraph:{type:'website',siteName:'Commonplace',title:page===1?'Commonplace — A journal, by everyone.':`Commonplace — Journal page ${page}`,description:SITE_DESCRIPTION,url:pageUrl(page),images:[{url:SITE_URL+'/social-card.png',width:1200,height:630,alt:'Commonplace — A journal, by everyone.'}]}}}
export default async function Home({searchParams}:Props){
 const page=parsePage((await searchParams).page);const data=await getEntriesPage(page);
 if(page>1&&!data.entries.length)notFound();
 const schema:WithContext<WebSite>={'@context':'https://schema.org','@type':'WebSite',name:'Commonplace',url:SITE_URL+'/',description:SITE_DESCRIPTION};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(schema)}}/><Journal initialEntries={data.entries} initialTotal={data.total} initialHasMore={data.hasMore} page={page}/></>;
}
