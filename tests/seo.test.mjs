import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parsePage,summary,xml,jsonLd,entryTitle,pageUrl,SITE_URL,formatEntryDate} from '../lib/seo.ts';
test('pagination accepts positive integers only and bounds work',()=>{assert.equal(parsePage('2'),2);for(const v of [undefined,'0','-1','1.5','1e3','abc','100001','2x'])assert.equal(parsePage(v),1)});
test('descriptions normalize whitespace and bound Unicode text',()=>{assert.equal(summary('  a\n b\t c  '),'a b c');assert.equal(Array.from(summary('أ'.repeat(200),160)).length,160);assert.ok(summary('أ'.repeat(200),160).endsWith('…'))});
test('XML escapes content rather than allowing markup',()=>assert.equal(xml(`<tag a="x">it's &`),'&lt;tag a=&quot;x&quot;&gt;it&apos;s &amp;'));
test('JSON-LD keeps user-controlled closing tags inside JSON',()=>{const value={text:'</script><script>alert(1)</script>\u2028'};const serialized=jsonLd(value);assert.ok(!serialized.includes('<'));assert.deepEqual(JSON.parse(serialized),value)});
test('untitled entries derive readable titles and canonical URLs use production origin',()=>{assert.equal(entryTitle({title:'',body:'A thought\n worth reading'}),'A thought worth reading');assert.equal(entryTitle({title:'  My title ',body:'Other'}),'My title');assert.equal(pageUrl(1),SITE_URL+'/');assert.equal(pageUrl(2),SITE_URL+'/?page=2')});
test('XML removes forbidden control characters and lone surrogates while retaining emoji',()=>{assert.equal(xml('before\u0001\u0000\ud800after 😀'),'beforeafter 😀');assert.equal(xml('line\n\ttab'),'line\n\ttab')});

test('publication date stays consistent across server and visitor timezones',()=>{assert.equal(formatEntryDate(Date.parse('2026-10-25T00:30:00Z')),'October 25, 2026')});
