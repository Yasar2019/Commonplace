'use client';
import {useState,useEffect} from 'react';
export default function EntryActions({entryId}:{entryId:string}){
 const [token,setToken]=useState(''),[status,setStatus]=useState(''),[reason,setReason]=useState('Spam'),[reporting,setReporting]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{try{setToken(JSON.parse(localStorage.getItem('commonplace-receipts')||'{}')[entryId]||'')}catch{}},[entryId]);
 async function remove(){if(!confirm('Remove your entry permanently?'))return;setBusy(true);try{const r=await fetch('/api/entries',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:entryId,token})});if(!r.ok)throw Error();location.href='/'}catch{setStatus('Couldn’t remove the entry. Try again.')}finally{setBusy(false)}}
 async function report(){setBusy(true);try{const r=await fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:entryId,reason})});if(!r.ok)throw Error();setStatus('Report recorded for review.');setReporting(false)}catch{setStatus('Couldn’t record the report. Try again.')}finally{setBusy(false)}}
 async function share(){try{await navigator.clipboard.writeText(location.href);setStatus('Link copied.')}catch{setStatus('Copy the page address from your browser to share this entry.')}}
 return <div className="entry-actions"><div><button onClick={share}>Copy entry link ↗</button><button onClick={()=>setReporting(v=>!v)}>Report entry</button>{token&&<button onClick={remove} disabled={busy}>Delete my entry</button>}</div>{reporting&&<div className="inline-report"><label htmlFor="report-reason">Reason</label><select id="report-reason" value={reason} onChange={e=>setReason(e.target.value)}>{['Spam','Harassment or hate','Private information','Other harmful content'].map(r=><option key={r}>{r}</option>)}</select><button onClick={report} disabled={busy}>Submit report</button></div>}<p role="status">{status}</p></div>;
}
