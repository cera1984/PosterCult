import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
// Never clean a path outside this project's fixed deployment directory.
if (dirname(output) !== root || basename(output) !== 'dist') throw new Error('Invalid deployment directory');
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && /\.(html|css|js|txt)$/.test(entry.name)) await cp(join(root, entry.name), join(output, entry.name));
}
for (const directory of ['assets', 'thumbs', 'vendor', 'docs']) {
  await cp(join(root, directory), join(output, directory), { recursive: true });
}
let count = 0, bytes = 0;
async function inventory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await inventory(path);
    else { count++; bytes += (await stat(path)).size; }
  }
}
await inventory(output);
console.log(`Static site ready: ${count} files, ${(bytes / 1024 / 1024).toFixed(1)} MiB in dist/`);
