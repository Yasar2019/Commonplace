import {env} from 'cloudflare:workers';import {api} from '../../../lib/security';import {reportEntry} from '../../../lib/backend';
export const POST=(req:Request)=>api(()=>reportEntry(req,env));
