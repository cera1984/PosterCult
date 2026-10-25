import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileAssetPaths } from './asset-paths.mjs';
const root = resolve('.');
const assets = fileAssetPaths(root);
const basePath = process.env.BASE_PATH || '';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (basePath && !requestPath.startsWith(basePath + '/')) { res.writeHead(404).end(); return; }
    const pathname = requestPath.slice(basePath.length);
    // Reproduce GitHub Pages' case-sensitive asset paths on Windows too.
    if (pathname.startsWith('/assets/originals/') || pathname.startsWith('/thumbs/')) {
      if (!assets.has(pathname.slice(1))) { res.writeHead(404).end('Not found'); return; }
    }
    const path = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`PosterCult: http://127.0.0.1:${process.env.PORT || 4173}${basePath}/`));
