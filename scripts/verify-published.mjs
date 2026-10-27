import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHONE_CASE_MODELS } from '../phone-case-models.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = new URL((process.env.PAGES_BASE_URL || 'https://cera1984.github.io/PosterCult').replace(/\/?$/, '/'));
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const entries = [...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^"#]*)?)"/g)].map(match => match[1]);
const assets = new Map();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function collect(reference, parent = base) {
  const url = new URL(reference, parent);
  if (!url.href.startsWith(base.href) || assets.has(url.href)) return;
  const path = decodeURIComponent(url.pathname.slice(base.pathname.length));
  const bytes = await readFile(resolve(root, path));
  assets.set(url.href, { path, hash: digest(bytes) });
  if (path.endsWith('.js')) {
    const imports = /(?:from\s*|import\s*\(\s*|new\s+URL\(\s*)['"](\.\/[^'"]+)['"]/g;
    for (const match of bytes.toString().matchAll(imports)) {
      if (!match[1].startsWith('./vendor/')) await collect(match[1], url);
    }
  }
}
for (const entry of entries) await collect(entry);
for (const model of PHONE_CASE_MODELS) await collect(model.asset);

async function fetchBytes(url) {
  const fresh = new URL(url);
  fresh.searchParams.set('verify', process.env.EXPECTED_COMMIT || String(Date.now()));
  const response = await fetch(fresh, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const attempts = Number(process.env.PAGES_VERIFY_ATTEMPTS || 6);
for (let attempt = 1; attempt <= attempts; attempt++) {
  try {
    const published = (await fetchBytes(base)).toString();
    for (const entry of entries) if (!published.includes(`"${entry}"`)) throw new Error(`Published HTML is missing ${entry}`);
    await Promise.all([...assets].map(async ([url, asset]) => {
      if (digest(await fetchBytes(url)) !== asset.hash) throw new Error(`Published content differs from checkout: ${asset.path}`);
    }));
    console.log(`Published HTML and ${assets.size} assets match this checkout.`);
    break;
  } catch (error) {
    if (attempt === attempts) throw error;
    console.log(`Waiting for Pages (${attempt}/${attempts}): ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
