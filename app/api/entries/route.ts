import {env} from 'cloudflare:workers';
import {api} from '../../../lib/security';
import {publicEntries,submitEntry,deleteEntry} from '../../../lib/backend';
export const GET=(req:Request)=>api(()=>publicEntries(req,env));
export const POST=(req:Request)=>api(()=>submitEntry(req,env));
export const DELETE=(req:Request)=>api(()=>deleteEntry(req,env));
