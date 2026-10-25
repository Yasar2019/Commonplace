import {env} from 'cloudflare:workers';import {api} from '../../../lib/security';import {myEntries} from '../../../lib/backend';
export const POST=(req:Request)=>api(()=>myEntries(req,env));
