"""Read-only smoke checks for a deployed public journal; no posts are created."""
import json, subprocess, sys, struct
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
BASE=sys.argv[1].rstrip('/')
def fetch(path):
    raw=subprocess.check_output(['curl','--max-time','20','--silent','--show-error','--location','--write-out','\n%{http_code}',BASE+path])
    body,status=raw.rsplit(b'\n',1)
    return int(status),body
class Head(HTMLParser):
    def __init__(self): super().__init__();self.meta={};self.links={}
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='meta':self.meta[a.get('name',a.get('property',''))]=a.get('content','')
        if tag=='link':self.links[a.get('rel','')]=a.get('href','')
def page(path):
    code,body=fetch(path);assert code==200,(path,code)
    p=Head();p.feed(body.decode());return body.decode(),p
html,h=page('/');assert h.links['canonical'].rstrip('/')==BASE
assert h.meta['og:image']==BASE+'/social-card.png',h.meta
assert h.meta['twitter:card']=='summary_large_image'
assert 'noindex' not in h.meta.get('robots','')
assert 'application/ld+json' in html
for path in ['/about','/privacy','/guidelines']:
    _,head=page(path);assert head.links['canonical']==BASE+path
code,body=fetch('/robots.txt');assert code==200 and (BASE+'/sitemap.xml').encode() in body
code,body=fetch('/sitemap.xml');assert code==200;root=ET.fromstring(body)
assert root.tag.endswith('sitemapindex')
code,body=fetch('/sitemaps/0.xml');assert code==200;chunk=ET.fromstring(body)
assert any(e.text==BASE+'/' for e in chunk.iter() if e.tag.endswith('loc'))
code,body=fetch('/feed.xml');assert code==200;assert ET.fromstring(body).tag=='rss'
code,body=fetch('/social-card.png');assert code==200;assert body[:8]==b'\x89PNG\r\n\x1a\n';assert struct.unpack('>II',body[16:24])==(1200,630)
code,_=fetch('/entry/not-a-real-entry');assert code==404,code
code,_=fetch('/entry/00000000-0000-4000-8000-000000000000');assert code==404,code
# When actual entries exist, verify the first one is server-rendered on its permanent page.
code,body=fetch('/api/entries');assert code==200;data=json.loads(body)
if data['entries']:
    entry=data['entries'][0];text,head=page('/entry/'+entry['id'])
    assert head.links['canonical']==BASE+'/entry/'+entry['id']
    assert 'BlogPosting' in text and entry['id'] in html
    assert 'delete_hash' not in text and 'journal_writer=' not in text
    print('PASS: permanent entry HTML and schema')
else:print('NOTE: production has no real entries; permanent-page rendering verified in preview.')
print('PASS: canonical/OG/Twitter metadata, information pages, robots, sitemap index/chunk, RSS, social image and 404 status codes.')
