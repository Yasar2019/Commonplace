export const SITE_URL='https://commonplace-open-journal.carlos-nazzarian.chatgpt.site';
export const SITE_NAME='Commonplace';
export const SITE_DESCRIPTION='An open, anonymous journal for thoughts, personal stories, and poetry. Read what others are feeling, or share your own words. No account or email needed.';
export function parsePage(value:string|undefined){if(!value||!/^\d+$/.test(value))return 1;const page=Number(value);return page>=1&&page<=100000?page:1}
export function summary(value:string,length=160){const text=Array.from(value.replace(/\s+/g,' ').trim());return text.length<=length?text.join(''):text.slice(0,length-1).join('')+'…'}
export function entryTitle(entry:{title:string;body:string}){return summary(entry.title.trim()||entry.body,80)}
export function pageUrl(page:number){return SITE_URL+(page===1?'/':'/?page='+page)}
export function xml(value:string){return value.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu,'').replace(/[<>&\"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!))}
export function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')}

export function formatEntryDate(value:number){return new Intl.DateTimeFormat('en',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value))}
