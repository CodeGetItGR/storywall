// @vitest-environment jsdom
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('built report page', () => {
    const page = read('scripts/visual/report/dist/index.html');

    it('asks crawlers to stay away', () => {
        expect(page).toContain('<meta name="robots" content="noindex, nofollow"');
    });

    it('is one page with its script and styles inside and nothing loaded from elsewhere', () => {
        const document = new DOMParser().parseFromString(page, 'text/html');
        const scripts = [...document.querySelectorAll('script')];
        expect(scripts).toHaveLength(1);
        expect(scripts[0].getAttribute('type')).toBe('module');
        expect(scripts[0].hasAttribute('src')).toBe(false);
        expect(scripts[0].textContent).toMatch(/\.render\(/);
        expect(document.querySelectorAll('style')).toHaveLength(1);
        expect(document.querySelectorAll('link[rel=stylesheet]')).toHaveLength(0);
        expect([...document.body.children].map((element) => element.id)).toEqual(['root']);
        expect(page).not.toMatch(/import\(|assets\//);
    });

    it('uses one kind of line ending, so every machine builds the same file', () => {
        expect(page).not.toContain('\r');
    });
});

describe('report page paths', () => {
    it('publishes the built page', () => {
        expect(read('scripts/visual/publish.mjs')).toContain("new URL('./report/dist/index.html', import.meta.url)");
    });

    it('uses the built page for local and CI reports', () => {
        expect(read('scripts/visual/steps.ts')).toContain("join('scripts', 'visual', 'report', 'dist', 'index.html')");
    });

    it('adds the PR link when publishing', () => {
        expect(read('scripts/visual/publish.mjs')).toContain('publishedManifest(manifest, { repo: GITHUB_REPOSITORY, prNumber: PR_NUMBER');
    });
});
