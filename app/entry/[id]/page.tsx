import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {entryJsonLd} from '../../../lib/entry-schema';
import {getEntry} from '../../../lib/journal';
import {entryTitle,summary,SITE_URL} from '../../../lib/seo';
import EntryActions from './EntryActions';
export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const entry=await getEntry((await params).id);if(!entry)return {title:'Entry not found | Commonplace',robots:{index:false,follow:false}};
 const title=entryTitle(entry);const description=summary(entry.body);const url=SITE_URL+'/entry/'+entry.id;
 return {title:title+' | Commonplace',description,alternates:{canonical:url},openGraph:{type:'article',title,description,url,publishedTime:new Date(entry.createdAt).toISOString(),section:entry.category,images:[{url:SITE_URL+'/social-card.png',width:1200,height:630,alt:'Commonplace — A journal, by everyone.'}]},twitter:{card:'summary_large_image',title,description,images:[SITE_URL+'/social-card.png']}};
}
export default async function EntryPage({params}:Props){
 const entry=await getEntry((await params).id);if(!entry)notFound();
 const title=entryTitle(entry),url=SITE_URL+'/entry/'+entry.id,date=new Date(entry.createdAt).toISOString();
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:entryJsonLd(entry)}}/><header><a className="brand" href="/">commonplace.</a><a className="write-nav" href="/#write">Leave a thought ↗</a></header><main className="reading-page"><a href="/" className="back-link">← Back to the journal</a><article><div className="eyebrow">A PAGE FROM THE SHARED JOURNAL</div><div className="reading-meta"><time dateTime={date}>{new Intl.DateTimeFormat('en',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(entry.createdAt))}</time><span className="category">{entry.category}</span></div><h1 dir="auto">{title}</h1><div className="reading-body" dir="auto">{entry.body}</div><p className="entry-signature">— Anonymous contributor. Someone, somewhere.</p><EntryActions entryId={entry.id}/></article><aside className="reading-invite"><h2>There’s room for your words, too.</h2><p>An open journal. No account, email, or name required.</p><a className="write-nav" href="/#write">Write a page of your own ↗</a></aside></main><footer><a className="brand" href="/">commonplace.</a><span className="footer-links"><a href="/about">About</a><a href="/guidelines">Guidelines</a><a href="/privacy">Privacy</a></span></footer></>;
}
