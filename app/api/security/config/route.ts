import {env} from 'cloudflare:workers';import {api} from '../../../../lib/security';import {securityConfig} from '../../../../lib/backend';
export const GET=()=>api(()=>securityConfig(env));
