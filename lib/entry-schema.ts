import {processors} from 'next-seo';
import type {Graph} from 'schema-dts';
import type {Entry} from './journal.ts';
import {entryTitle,summary,SITE_URL,jsonLd} from './seo.ts';
/** next-seo builds schema values; our serializer escapes every '<' for user content. */
export function entryJsonLd(entry:Entry){
 const title=entryTitle(entry),url=SITE_URL+'/entry/'+entry.id,date=new Date(entry.createdAt).toISOString();
 const processedAuthor=processors.processAuthor({name:'Anonymous contributor'});
 const graph:Graph={'@context':'https://schema.org','@graph':[
  {'@type':'BlogPosting',headline:title,description:summary(entry.body),url,datePublished:date,dateModified:date,author:{'@type':processedAuthor['@type'],name:processedAuthor.name},image:SITE_URL+'/social-card.png',mainEntityOfPage:url,isAccessibleForFree:true},
  {'@type':'BreadcrumbList',itemListElement:[processors.processBreadcrumbItem({name:'Commonplace',item:SITE_URL+'/'},1),processors.processBreadcrumbItem({name:title,item:url},2)]}
 ]};
 return jsonLd(graph);
}
