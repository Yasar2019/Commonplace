'use client';
import {useEffect,useRef,useState} from 'react';
type TurnstileApi={render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void};
declare global{interface Window{turnstile?:TurnstileApi}}
let scriptReady:Promise<void>|undefined;
function loadScript(){if(window.turnstile)return Promise.resolve();if(!scriptReady)scriptReady=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.onload=()=>window.turnstile?resolve():reject(Error('Verification unavailable'));script.onerror=()=>{scriptReady=undefined;script.remove();reject(Error('Verification unavailable'))};document.head.appendChild(script)});return scriptReady}
export default function Turnstile({siteKey,action,onToken,resetKey=0}:{siteKey:string;action:'publish'|'report';onToken:(token:string)=>void;resetKey?:number}){
 const target=useRef<HTMLDivElement>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let disposed=false,id:string|undefined;onToken('');setError('');loadScript().then(()=>{if(disposed||!target.current)return;id=window.turnstile!.render(target.current,{sitekey:siteKey,action,theme:'light',size:'flexible',callback:(token:string)=>onToken(token),'expired-callback':()=>onToken(''),'error-callback':()=>{onToken('');setError('Verification could not complete. Please retry.')}})}).catch(()=>{if(!disposed)setError('Verification could not load. Check your connection and retry.')});return()=>{disposed=true;if(id)window.turnstile?.remove(id)}},[siteKey,action,onToken,resetKey,retry]);
 return <div className="verification"><div ref={target}/>{error&&<p role="alert">{error} <button type="button" onClick={()=>setRetry(v=>v+1)}>Retry verification</button></p>}</div>;
}
