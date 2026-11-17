import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, resolve, sep } from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
};

function resolveInside(root: string, url: string): string | null {
    try {
        const file = resolve(join(root, decodeURIComponent(new URL(url, 'http://local').pathname)));
        return file.startsWith(root + sep) ? file : null;
    } catch {
        return null;
    }
}

export async function serveStatic(root: string): Promise<{ origin: string; close: () => Promise<void> }> {
    const absoluteRoot = resolve(root);
    const server = createServer((request, response) => {
        const file = resolveInside(absoluteRoot, request.url ?? '/');
        if (!file || !existsSync(file) || !statSync(file).isFile()) {
            response.writeHead(404);
            response.end();
            return;
        }
        response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
        response.end(readFileSync(file));
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const { port } = server.address() as AddressInfo;
    return {
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done())),
    };
}
