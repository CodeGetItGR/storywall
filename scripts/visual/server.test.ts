// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { serveStatic } from './server';

describe('serveStatic', () => {
    let parent: string;
    let root: string;
    let server: Awaited<ReturnType<typeof serveStatic>>;

    beforeEach(async () => {
        parent = mkdtempSync(join(tmpdir(), 'visual-server-'));
        root = join(parent, 'site');
        mkdirSync(root);
        writeFileSync(join(root, 'mockServiceWorker.js'), 'self.x = 1;');
        writeFileSync(join(parent, 'secret.txt'), 'secret');
        server = await serveStatic(root);
    });

    afterEach(async () => {
        await server.close();
        rmSync(parent, { recursive: true, force: true });
    });

    it('serves a file with its content type', async () => {
        const response = await fetch(`${server.origin}/mockServiceWorker.js`);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('javascript');
        expect(await response.text()).toBe('self.x = 1;');
    });

    it('answers 404 for a missing file', async () => {
        expect((await fetch(`${server.origin}/nope.js`)).status).toBe(404);
    });

    // An encoded slash survives URL parsing, so this reaches the server as a path outside the root.
    it('does not serve files outside the root', async () => {
        const response = await fetch(`${server.origin}/..%2fsecret.txt`);
        expect(response.status).toBe(404);
    });

    it('answers 404 for a malformed path', async () => {
        expect((await fetch(`${server.origin}/%E0%A4%A`)).status).toBe(404);
    });
});
