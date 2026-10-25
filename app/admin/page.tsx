import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {verifyAdmin} from '../../lib/security';
import Dashboard from './Dashboard';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Owner moderation | Commonplace',robots:{index:false,follow:false}};
export default async function Admin(){try{await verifyAdmin(await headers(),env)}catch{return <main className="reading-page info-page"><a className="brand" href="/">commonplace.</a><h1>Owner area.</h1><p>This area is restricted. Sign in through the owner’s Cloudflare Access policy to open moderation.</p><a className="info-cta" href="/">Return to the journal →</a></main>}return <Dashboard/>}
