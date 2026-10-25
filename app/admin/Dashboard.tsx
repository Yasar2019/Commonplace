'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleCheck, Clock3, EyeOff, Flag, History, Inbox, LoaderCircle, LockKeyhole, RefreshCw, Search, Settings2, ShieldCheck, X } from 'lucide-react';
import './admin.css';

type View = 'pending' | 'reported' | 'published' | 'hidden' | 'rejected' | 'audit' | 'settings';
type Entry = { id: string; title: string; body: string; category: string; createdAt: number; status: string; version: number; reportCount: number };
type Report = { id: string; entryId: string; reason: string; createdAt: number; status: string };
type Audit = { id: string; entryId: string | null; action: string; actor: string; reason: string; createdAt: number };
type Result = { entries: Entry[]; reports: Report[]; audit: Audit[]; total: number; page: number; counts: Record<'pending' | 'reported' | 'published' | 'hidden' | 'rejected', number>; postingPaused: boolean; readiness: { turnstile: boolean; rateLimit: boolean; admin: boolean } };
const sections = [
  { id: 'pending', label: 'Pending review', icon: Inbox, description: 'A little care before a wider audience.' },
  { id: 'reported', label: 'Reported', icon: Flag, description: 'Listen closely. Review the words and their context.' },
  { id: 'published', label: 'Published', icon: BookOpen, description: 'The words currently out in the world.' },
  { id: 'hidden', label: 'Hidden', icon: EyeOff, description: 'Set aside from the public journal.' },
  { id: 'rejected', label: 'Rejected', icon: X, description: 'Submissions that were not published.' },
  { id: 'audit', label: 'Activity log', icon: History, description: 'A record of the decisions that shape this space.' },
  { id: 'settings', label: 'Settings', icon: Settings2, description: 'Keep this small corner of the internet well tended.' },
] as const;
const date = (value: number) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const readable = (value: string) => value.replace(/[_-]/g, ' ');

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, credentials: 'same-origin', mode: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json', ...(options?.body ? { 'Content-Type': 'application/json' } : {}) } });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(response.status === 409 ? 'This entry has changed since you opened it. Refresh and review the latest version before trying again.' : payload?.error || (response.status === 403 ? 'Your owner session could not be verified. Sign in through Cloudflare Access and try again.' : 'The dashboard could not reach the server. Please try again.'));
  if (!payload) throw new Error('The server returned an unreadable response. Please try again.');
  return payload as T;
}

export default function Dashboard() {
  const [view, setView] = useState<View>('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [settingsReason, setSettingsReason] = useState('');
  const section = sections.find(item => item.id === view)!;
  useEffect(() => {
    const controller = new AbortController();
    api<Result>(`/api/admin?${new URLSearchParams({ view, page: String(page), q: query })}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(err => { if (!controller.signal.aborted) { setData(null); setError(err instanceof Error ? err.message : 'Could not load the dashboard.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [view, page, query, refresh]);
  function refreshData() { setLoading(true); setError(''); setRefresh(value => value + 1); }
  function changePage(next: number) { setLoading(true); setError(''); setPage(next); }
  function navigate(next: View) { refreshData(); setView(next); setPage(1); setSearch(''); setQuery(''); setNotice(''); setError(''); }
  async function mutate(payload: Record<string, unknown>, message: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      await api('/api/admin', { method: 'POST', body: JSON.stringify(payload) });
      setNotice(message); setReasons({}); setSettingsReason(''); refreshData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save your decision.'); }
    finally { setBusy(false); }
  }
  const locked = busy || loading;
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link href="/" className="admin-brand"><span><BookOpen size={16} strokeWidth={1.4} /></span>commonplace<span className="admin-brand-dot">.</span></Link>
      <div className="admin-space-label"><LockKeyhole size={11} /> OWNER’S DESK</div>
      <nav className="admin-nav" aria-label="Moderation views">{sections.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} disabled={busy} className={view === id ? 'is-active' : ''} aria-current={view === id ? 'page' : undefined}><Icon size={16} strokeWidth={1.6} /><span>{label}</span>{data && id in data.counts && <span className="admin-nav-count">{data.counts[id as keyof Result['counts']]}</span>}</button>)}</nav>
      <div className="admin-sidebar-note"><span className="admin-status-dot" /> A space worth looking after.<p>Your decisions stay private.<br />Your care reaches everyone.</p></div>
      <Link href="/" className="admin-back"><ArrowLeft size={13} /> Back to the journal</Link>
    </aside>
    <div className="admin-workspace">
      <div className="admin-topbar"><span><ShieldCheck size={14} /> Private owner workspace</span><span>COMMONPLACE / MODERATION</span></div>
      <main className="admin-main">
        <div className="admin-heading"><div><div className="admin-eyebrow">TENDING THE JOURNAL</div><h1>{section.label}<span>.</span></h1><p>{section.description}</p></div><button className="admin-icon-button" title="Refresh dashboard" aria-label="Refresh dashboard" disabled={locked} onClick={refreshData}><RefreshCw size={17} className={loading ? 'admin-spin' : ''} /></button></div>
        {error && <div className="admin-message admin-error" role="alert"><Flag size={17} /><div>{error}<button disabled={locked} onClick={refreshData}>Refresh dashboard</button></div></div>}
        {notice && <div className="admin-message admin-success" role="status"><CircleCheck size={17} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></div>}
        {data?.postingPaused && view !== 'settings' && <div className="admin-pause-banner"><Clock3 size={15} /> New submissions are paused.<button onClick={() => navigate('settings')}>Manage settings <ChevronRight size={12} /></button></div>}
        {view !== 'settings' && <form className="admin-search" onSubmit={event => { event.preventDefault(); refreshData(); setQuery(search.trim()); setPage(1); }}><Search size={16} /><label className="sr-only" htmlFor="admin-search">{view === 'audit' ? 'Search activity' : 'Search entries'}</label><input id="admin-search" value={search} onChange={event => setSearch(event.target.value)} placeholder={view === 'audit' ? 'Search activity…' : 'Search title or words…'} maxLength={120} disabled={busy} /><button type="submit" disabled={locked}>Search</button>{query && <button type="button" onClick={() => { refreshData(); setSearch(''); setQuery(''); setPage(1); }} disabled={locked}>Clear</button>}</form>}
        {loading ? <div className="admin-loading" role="status"><LoaderCircle size={24} className="admin-spin" /><p>Opening the journal…</p></div> : data && <>
          {view === 'settings' ? <div className="admin-settings">
            <section className="admin-panel"><div className="admin-panel-icon"><Clock3 size={21} strokeWidth={1.5} /></div><h2>A moment to pause</h2><p>Pause new submissions when the journal needs a little breathing room. Published entries remain available to read.</p><div className="admin-setting-status"><span className={`admin-status-dot ${data.postingPaused ? 'paused' : ''}`} /> {data.postingPaused ? 'New submissions are paused' : 'Accepting new submissions'}</div><label htmlFor="pause-reason">Reason for this change <span>Required · recorded in the activity log</span></label><textarea id="pause-reason" value={settingsReason} maxLength={600} onChange={event => setSettingsReason(event.target.value)} placeholder="A brief note for the record…" disabled={busy} /><button className="admin-button admin-primary" disabled={locked || !settingsReason.trim()} onClick={() => mutate({ type: 'settings', postingPaused: !data.postingPaused, reason: settingsReason.trim() }, data.postingPaused ? 'New submissions are open again.' : 'New submissions have been paused.')}>{busy ? 'Saving…' : data.postingPaused ? 'Resume submissions' : 'Pause submissions'}</button></section>
            <section className="admin-panel"><div className="admin-panel-icon"><ShieldCheck size={21} strokeWidth={1.5} /></div><h2>Ready for visitors</h2><p>Live configuration checks supplied by the server. Missing protection must be configured before launch.</p><div className="admin-readiness">{[{ key: 'turnstile', label: 'Bot verification', detail: 'Cloudflare Turnstile' }, { key: 'rateLimit', label: 'Request protection', detail: 'Private network keys & rate limits' }, { key: 'admin', label: 'Owner access', detail: 'Cloudflare Access & email allowlist' }].map(item => { const ready = data.readiness[item.key as keyof Result['readiness']]; return <div key={item.key}><span className={`admin-readiness-icon ${ready ? 'ready' : ''}`}>{ready ? <Check size={15} /> : <X size={15} />}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div><span className={ready ? 'admin-ready-label' : 'admin-needs-label'}>{ready ? 'Configured' : 'Needs setup'}</span></div>; })}</div></section>
          </div> : <>
            <div className="admin-list-heading"><span>{data.total.toLocaleString()} {view === 'audit' ? 'events' : 'entries'}{query && <> matching “{query}”</>}</span><span>{view === 'audit' ? 'EVERY DECISION, RECORDED' : 'READ WITH CARE'}</span></div>
            {view === 'audit' ? <div className="admin-audit-list">{data.audit.map(event => <article key={event.id} className="admin-audit-event"><div className="admin-audit-mark"><History size={15} /></div><div><div className="admin-audit-top"><strong>{readable(event.action)}</strong><time dateTime={new Date(event.createdAt).toISOString()}>{date(event.createdAt)}</time></div><p>{event.reason || 'No reason supplied.'}</p><small>{event.actor}{event.entryId && <> · Entry {event.entryId}</>}</small></div></article>)}</div> : <div className="admin-entry-list">{data.entries.map(entry => {
              const reason = reasons[entry.id] || '';
              const reports = data.reports.filter(report => report.entryId === entry.id);
              return <article className="admin-entry" key={entry.id}>
                <div className="admin-entry-meta"><span className="admin-category">{entry.category}</span><span className={`admin-entry-status status-${entry.status}`}>{readable(entry.status)}</span><time dateTime={new Date(entry.createdAt).toISOString()}>{date(entry.createdAt)}</time>{entry.reportCount > 0 && <span className="admin-report-count"><Flag size={11} />{entry.reportCount} {entry.reportCount === 1 ? 'report' : 'reports'}</span>}</div>
                <h2>{entry.title || 'Untitled'}</h2><div className="admin-entry-body">{entry.body}</div>
                {reports.length > 0 && <div className="admin-reports"><div className="admin-field-label">OPEN REPORTS</div>{reports.map(report => <div className="admin-report" key={report.id}><div><strong>{readable(report.reason)}</strong><time dateTime={new Date(report.createdAt).toISOString()}>{date(report.createdAt)}</time></div><div><button disabled={locked || !reason.trim()} onClick={() => mutate({ type: 'report', id: report.id, action: 'resolve', reason: reason.trim() }, 'Report resolved and recorded.')}>Resolve</button><button disabled={locked || !reason.trim()} onClick={() => mutate({ type: 'report', id: report.id, action: 'dismiss', reason: reason.trim() }, 'Report dismissed and recorded.')}>Dismiss</button></div></div>)}</div>}
                <div className="admin-entry-decision"><label htmlFor={`reason-${entry.id}`}>Decision note <span>Required for hide, reject and report decisions</span></label><textarea id={`reason-${entry.id}`} value={reason} onChange={event => setReasons(current => ({ ...current, [entry.id]: event.target.value }))} placeholder="Add context for the activity log…" maxLength={600} disabled={busy} /><div className="admin-entry-actions"><span>Version {entry.version}</span>{entry.status !== 'published' && <button className="admin-button admin-primary" disabled={locked} onClick={() => mutate({ type: 'entry', id: entry.id, version: entry.version, action: 'publish', reason: reason.trim() }, entry.status === 'hidden' || entry.status === 'rejected' ? 'Entry restored to the public journal.' : 'Entry published to the journal.')}><Check size={13} />{entry.status === 'hidden' || entry.status === 'rejected' ? 'Restore & publish' : 'Publish'}</button>}{entry.status !== 'hidden' && <button className="admin-button" disabled={locked || !reason.trim()} onClick={() => mutate({ type: 'entry', id: entry.id, version: entry.version, action: 'hide', reason: reason.trim() }, 'Entry hidden from the public journal.')}><EyeOff size={13} />Hide</button>}{entry.status !== 'rejected' && <button className="admin-button admin-reject" disabled={locked || !reason.trim()} onClick={() => mutate({ type: 'entry', id: entry.id, version: entry.version, action: 'reject', reason: reason.trim() }, 'Entry rejected and recorded.')}><X size={13} />Reject</button>}</div></div>
              </article>;
            })}</div>}
            {data.total === 0 && <div className="admin-empty"><section.icon size={32} strokeWidth={1} /><h2>{query ? 'No matching words.' : view === 'pending' ? 'A quiet desk.' : 'Nothing here just yet.'}</h2><p>{query ? 'Try another search or clear the filter.' : view === 'pending' ? 'New submissions will appear here for your review.' : 'Items will appear here when there is something to review.'}</p></div>}
            {(data.total > 0 || page > 1) && <div className="admin-pagination"><button className="admin-button" disabled={locked || page === 1} onClick={() => changePage(page - 1)}><ArrowLeft size={13} />Previous</button><span>Page {data.page} of {Math.max(1, Math.ceil(data.total / 20))}</span><button className="admin-button" disabled={locked || page * 20 >= data.total} onClick={() => changePage(page + 1)}>Next<ArrowRight size={13} /></button></div>}
          </>}
        </>}
        <div className="admin-bottom-note"><LockKeyhole size={11} /> Only verified owners can access this workspace. Every change leaves a record.</div>
      </main>
    </div>
  </div>;
}
