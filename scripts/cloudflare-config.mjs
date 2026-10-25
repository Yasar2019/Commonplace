import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function requireValue(condition, message) {
  if (!condition) throw new Error(`Invalid Cloudflare configuration: ${message}`);
}
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function onlyKeys(value, keys, label) {
  requireValue(object(value), `${label} must be an object`);
  requireValue(Object.keys(value).every(key => keys.includes(key)), `${label} contains unsupported keys; keep secrets in Wrangler secret storage`);
}
function canonicalOrigin(value, key) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`Invalid Cloudflare configuration: ${key} must be a canonical HTTPS origin`); }
  requireValue(typeof value === 'string' && url.protocol === 'https:' && value === url.origin &&
    !url.username && !url.password && url.hostname.includes('.') &&
    !/^(localhost|127\.|0\.|\[)/.test(url.hostname), `${key} must be a canonical HTTPS origin without a trailing slash`);
  return url;
}

export function validateCloudflareConfig(input) {
  onlyKeys(input, ['name', 'account_id', 'd1_databases', 'vars'], 'configuration');
  requireValue(typeof input.name === 'string' && /^[a-z][a-z0-9-]{1,61}[a-z0-9]$/.test(input.name), 'name must be a Workers name (3–63 lowercase characters)');
  requireValue(typeof input.account_id === 'string' && /^[a-f0-9]{32}$/i.test(input.account_id) && !/^0+$/.test(input.account_id), 'account_id must be your 32-character Cloudflare account ID');
  requireValue(Array.isArray(input.d1_databases) && input.d1_databases.length === 1, 'D1 requires exactly one DB binding');
  const database = input.d1_databases[0];
  onlyKeys(database, ['binding', 'database_name', 'database_id'], 'D1');
  requireValue(database.binding === 'DB', 'D1 binding must be DB');
  requireValue(typeof database.database_name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/.test(database.database_name), 'database_name is required');
  requireValue(typeof database.database_id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(database.database_id) && !/^00000000-/.test(database.database_id), 'database_id must be your actual D1 UUID');
  const keys = ['SITE_URL', 'ADMIN_EMAILS', 'ACCESS_TEAM_DOMAIN', 'ACCESS_AUD', 'TURNSTILE_SITE_KEY'];
  onlyKeys(input.vars, keys, 'vars');
  for (const key of keys) requireValue(typeof input.vars[key] === 'string' && input.vars[key].length > 0, `${key} is required`);
  canonicalOrigin(input.vars.SITE_URL, 'SITE_URL');
  const emails = input.vars.ADMIN_EMAILS.split(',').map(value => value.trim());
  requireValue(emails.every(email => /^[a-zA-Z0-9.!#$%&'+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(email)), 'ADMIN_EMAILS must contain explicit comma-separated email addresses');
  const team = canonicalOrigin(input.vars.ACCESS_TEAM_DOMAIN, 'ACCESS_TEAM_DOMAIN');
  requireValue(!team.port && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cloudflareaccess\.com$/.test(team.hostname), 'ACCESS_TEAM_DOMAIN must use https://TEAM.cloudflareaccess.com');
  requireValue(/^[a-f0-9]{64}$/i.test(input.vars.ACCESS_AUD), 'ACCESS_AUD must be the 64-character Access application audience');
  requireValue(/^[a-zA-Z0-9_-]{10,200}$/.test(input.vars.TURNSTILE_SITE_KEY) && !/^[123]x0+/.test(input.vars.TURNSTILE_SITE_KEY), 'TURNSTILE_SITE_KEY must be a real production widget key');
  return {
    name: input.name,
    account_id: input.account_id,
    main: './worker/index.ts',
    compatibility_date: '2026-05-15',
    compatibility_flags: ['nodejs_compat'],
    d1_databases: [{ ...database, migrations_dir: 'drizzle' }],
    vars: { ...input.vars, ADMIN_EMAILS: emails.map(email => email.toLowerCase()).join(',') },
  };
}

// Vite preserves migrations_dir verbatim; Wrangler resolves it relative to the
// generated config in dist/server, not the repository root.
export function prepareGeneratedCloudflareConfig(generated, owner) {
  const database = generated.d1_databases?.[0];
  if (generated.name !== owner.name || generated.account_id !== owner.account_id ||
      generated.d1_databases?.length !== 1 || database?.binding !== 'DB' ||
      database.database_id !== owner.d1_databases[0].database_id ||
      database.database_name !== owner.d1_databases[0].database_name ||
      Object.keys(owner.vars).some(key => generated.vars?.[key] !== owner.vars[key])) {
    throw new Error('Generated dist/server/wrangler.json does not match owner configuration; do not deploy.');
  }
  return { ...generated, d1_databases: [{ ...database, migrations_dir: '../../drizzle' }] };
}

export function loadCloudflareConfig(root = process.cwd()) {
  const filename = resolve(root, 'cloudflare.config.json');
  let contents;
  try { contents = readFileSync(filename, 'utf8'); }
  catch { throw new Error(`Missing readable ${filename}. Copy cloudflare.example.json and fill in your account configuration.`); }
  let input;
  try { input = JSON.parse(contents); }
  catch { throw new Error(`Invalid JSON in ${filename}`); }
  return validateCloudflareConfig(input);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    loadCloudflareConfig();
    console.log('Cloudflare configuration valid. Runtime secrets and external services still require owner setup.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
