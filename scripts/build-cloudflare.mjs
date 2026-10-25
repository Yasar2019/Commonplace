import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCloudflareConfig, prepareGeneratedCloudflareConfig } from './cloudflare-config.mjs';

// Invoke Vite directly: the Sites packaging wrapper is for the managed host.
const root = fileURLToPath(new URL('../', import.meta.url));
const config = loadCloudflareConfig(root);
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, COMMONPLACE_TARGET: 'cloudflare', NEXT_PUBLIC_SITE_URL: config.vars.SITE_URL },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const generated = JSON.parse(readFileSync(resolve(root, 'dist/server/wrangler.json'), 'utf8'));
writeFileSync(resolve(root, 'dist/server/wrangler.json'), JSON.stringify(prepareGeneratedCloudflareConfig(generated, config), null, 2) + '\n');
console.log('Cloudflare build ready at dist/server/wrangler.json. No account changes or deployment performed.');
