import {env} from 'cloudflare:workers';
import {getPublicPage,getPublicEntry} from './public-store';
export type Entry={id:string;title:string;body:string;category:string;createdAt:number};
export const PAGE_SIZE=30;
export const getEntriesPage=(page=1)=>getPublicPage(env.DB!,page);
export const getEntry=(id:string)=>getPublicEntry(env.DB!,id);
