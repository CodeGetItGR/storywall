// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('built report page', () => {
    const page = read('scripts/visual/report/dist/index.html');

    it('asks crawlers to stay away', () => {
        expect(page).toContain('<meta name="robots" content="noindex, nofollow"');
    });

    it('has its script and styles inside', () => {
        expect(page).toContain('<script type="module">');
        expect(page).toContain('<style>');
    });

    it('loads no script or stylesheet from elsewhere', () => {
        expect(page).not.toMatch(/<script[^>]*\ssrc=/);
        expect(page).not.toMatch(/<link[^>]*stylesheet/);
    });

    it('uses one kind of line ending, so every machine builds the same file', () => {
        expect(page).not.toContain('\r');
    });
});

describe('report page paths', () => {
    it('publishes the built page', () => {
        expect(read('scripts/visual/publish.mjs')).toContain("new URL('./report/dist/index.html', import.meta.url)");
    });

    it('uses the built page for local runs', () => {
        expect(read('scripts/visual/run.ts')).toContain("join('scripts', 'visual', 'report', 'dist', 'index.html')");
    });

    it('adds the PR link when publishing', () => {
        expect(read('scripts/visual/publish.mjs')).toContain('publishedManifest(manifest, { repo: GITHUB_REPOSITORY, prNumber: PR_NUMBER');
    });
});
