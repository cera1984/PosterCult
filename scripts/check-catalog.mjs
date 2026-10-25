import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { trackedAssetPaths } from './asset-paths.mjs';

const context = { window: {} };
vm.runInNewContext(await readFile('gallery-data.js', 'utf8'), context);
const paths = trackedAssetPaths(), folded = new Map();
for (const path of paths) {
  const key = path.toLowerCase();
  if (folded.has(key)) throw new Error(`Ambiguous case: ${path}`);
  folded.set(key, path);
}
const items = context.window.POSTERZ_IMAGES;
const problems = [];
for (const item of items) for (const field of ['original', 'thumbnail']) {
  if (!paths.has(item[field])) {
    const actual = folded.get(item[field].toLowerCase());
    problems.push({ field, requested: item[field], actual });
    if (actual && process.argv.includes('--fix')) item[field] = actual;
  }
}
if (problems.some(problem => !problem.actual)) throw new Error(JSON.stringify(problems.filter(p => !p.actual)));
if (process.argv.includes('--fix')) {
  await writeFile('gallery-data.js', 'window.POSTERZ_IMAGES = ' + JSON.stringify(items) + ';\n');
  console.log(`Fixed ${problems.length} path case mismatches in ${items.length} catalog entries.`);
} else {
  console.log(JSON.stringify({ images: items.length, pathCaseMismatches: problems.length, missing: 0 }));
  if (problems.length) process.exitCode = 1;
}
