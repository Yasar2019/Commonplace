import {test} from 'node:test';
import assert from 'node:assert/strict';
import {entryJsonLd} from '../lib/entry-schema.ts';
for(const ending of ['</script>','</script >','</script\n>','</ScRiPt\t>'])test('entry schema safely handles '+JSON.stringify(ending),()=>{const payload=ending+'<script>alert(1)</script >';const serialized=entryJsonLd({id:'73739738-9cce-43dc-9f52-99fe6014b624',title:payload,body:payload,category:'Thoughts',createdAt:0});assert.ok(!serialized.includes('<'));const data=JSON.parse(serialized);assert.equal(data['@graph'][0].headline,payload.replace(/\s+/g,' ').trim());assert.equal(data['@graph'][0].datePublished,'1970-01-01T00:00:00.000Z');assert.equal(data['@graph'][1].itemListElement.length,2)});
