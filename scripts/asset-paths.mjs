import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export function trackedAssetPaths(root = process.cwd()) {
  return new Set(execFileSync('git', ['-c', `safe.directory=${root}`, 'ls-files', '-z', '--', 'assets/originals', 'thumbs'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean));
}

export function fileAssetPaths(root = process.cwd()) {
  const paths = new Set();
  const walk = relative => {
    for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(path); else if (entry.isFile()) paths.add(path);
    }
  };
  walk('assets/originals'); walk('thumbs');
  return paths;
}
