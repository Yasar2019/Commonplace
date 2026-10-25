import {env} from 'cloudflare:workers';import {api} from '../../../lib/security';import {adminRead,adminMutate} from '../../../lib/backend';
export const GET=(req:Request)=>api(()=>adminRead(req,env));
export const POST=(req:Request)=>api(()=>adminMutate(req,env));
