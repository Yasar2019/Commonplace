import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateCloudflareConfig, loadCloudflareConfig } from '../scripts/cloudflare-config.mjs';

const valid = () => ({
  name: 'commonplace-journal', account_id: 'a'.repeat(32),
  d1_databases: [{ binding: 'DB', database_name: 'commonplace', database_id: '12345678-1234-4234-8234-123456789abc' }],
  vars: { SITE_URL: 'https://journal.example.org', ADMIN_EMAILS: 'owner@example.org',
    ACCESS_TEAM_DOMAIN: 'https://my-team.cloudflareaccess.com', ACCESS_AUD: 'b'.repeat(64),
    TURNSTILE_SITE_KEY: '0x4AAAAAAExampleRealSiteKey' },
});

test('valid configuration produces only declared worker bindings and security vars', () => {
  const result = validateCloudflareConfig(valid());
  assert.equal(result.vars.SITE_URL, 'https://journal.example.org');
  assert.equal(result.d1_databases[0].binding, 'DB');
  assert.equal(result.d1_databases[0].migrations_dir, 'drizzle');
  assert.equal(result.main, './worker/index.ts');
  assert.deepEqual(result.compatibility_flags, ['nodejs_compat']);
});

test('rejects missing values and placeholder deployment identities', () => {
  for (const key of ['name', 'account_id', 'vars', 'd1_databases']) {
    const config = valid(); delete config[key];
    assert.throws(() => validateCloudflareConfig(config), /configuration|name|account_id|vars|D1/i);
  }
  const config = valid(); config.d1_databases[0].database_id = '00000000-0000-4000-8000-000000000000';
  assert.throws(() => validateCloudflareConfig(config), /database_id/);
});

test('canonical origin requires HTTPS with no path, credentials, query or fragment', () => {
  for (const origin of ['http://journal.example.org', 'https://journal.example.org/path', 'https://x:y@journal.example.org', 'https://journal.example.org?x=1', 'https://journal.example.org/#x', 'https://localhost', 'https://127.0.0.1']) {
    const config = valid(); config.vars.SITE_URL = origin;
    assert.throws(() => validateCloudflareConfig(config), /SITE_URL/);
  }
});

test('requires owner email allowlist and Cloudflare Access issuer and audience', () => {
  for (const [key, value] of [['ADMIN_EMAILS', ''], ['ADMIN_EMAILS', '*@example.org'], ['ADMIN_EMAILS', 'owner@example.org,'], ['ACCESS_TEAM_DOMAIN', 'https://evil.test'], ['ACCESS_TEAM_DOMAIN', 'https://team.cloudflareaccess.com:444'], ['ACCESS_TEAM_DOMAIN', 'https://team.cloudflareaccess.com/extra'], ['ACCESS_AUD', '']]) {
    const config = valid(); config.vars[key] = value;
    assert.throws(() => validateCloudflareConfig(config), new RegExp(key));
  }
});

test('rejects unknown configuration, extra bindings, secrets and auth bypasses', () => {
  for (const edit of [c => c.vars.RATE_LIMIT_SECRET = 's'.repeat(32), c => c.vars.TURNSTILE_SECRET = 'secret', c => c.vars.DEV_AUTH = 'true', c => c.routes = ['*/*'], c => c.d1_databases[0].binding = 'OTHER', c => c.d1_databases.push(c.d1_databases[0])]) {
    const config = valid(); edit(config);
    assert.throws(() => validateCloudflareConfig(config));
  }
});

test('rejects Turnstile test keys and missing public widget key', () => {
  for (const key of ['', '1x00000000000000000000AA', '2x00000000000000000000AB', '3x00000000000000000000FF']) {
    const config = valid(); config.vars.TURNSTILE_SITE_KEY = key;
    assert.throws(() => validateCloudflareConfig(config), /TURNSTILE_SITE_KEY/);
  }
});

test('loads ignored owner file and fails clearly for missing or malformed files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'commonplace-cf-'));
  try {
    assert.throws(() => loadCloudflareConfig(directory), /cloudflare.config.json/);
    writeFileSync(join(directory, 'cloudflare.config.json'), '{');
    assert.throws(() => loadCloudflareConfig(directory), /JSON/);
    writeFileSync(join(directory, 'cloudflare.config.json'), JSON.stringify(valid()));
    assert.equal(loadCloudflareConfig(directory).name, 'commonplace-journal');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('normalizes generated migration path relative to dist/server and rejects mismatched builds', async () => {
  const { prepareGeneratedCloudflareConfig } = await import('../scripts/cloudflare-config.mjs');
  const owner = validateCloudflareConfig(valid());
  const generated = { ...owner, main: 'index.js', assets: { directory: '../client' } };
  const result = prepareGeneratedCloudflareConfig(generated, owner);
  assert.equal(result.d1_databases[0].migrations_dir, '../../drizzle');
  assert.equal(result.main, 'index.js');
  assert.deepEqual(result.assets, generated.assets);
  assert.throws(() => prepareGeneratedCloudflareConfig({ ...generated, account_id: 'c'.repeat(32) }, owner), /does not match/);
  assert.throws(() => prepareGeneratedCloudflareConfig({ ...generated, vars: { ...owner.vars, ACCESS_AUD: 'd'.repeat(64) } }, owner), /does not match/);
});
