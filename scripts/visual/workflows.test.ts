// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { devDependencies: Record<string, string> }).devDependencies['playwright-core'];

describe.each(['visual-check', 'visual-baseline'])('%s workflow', (name) => {
    const workflow = readFileSync(`.github/workflows/${name}.yml`, 'utf8');

    it('uses the container matching playwright-core', () => {
        expect(workflow).toContain(`mcr.microsoft.com/playwright:v${version}-noble`);
    });

    it('uses the same Playwright version in the cache key', () => {
        expect(workflow).toContain(`-pw${version}`);
    });
});

describe('deploy key', () => {
    it('publishes with the scripts from the base commit', () => {
        const check = readFileSync('.github/workflows/visual-check.yml', 'utf8');
        const publish = check.slice(check.indexOf('    publish:'), check.indexOf('    finish:'));
        expect(publish).toContain('ref: ${{ github.event.pull_request.base.sha }}');
        expect(publish).not.toContain('head.sha');
    });

    it('cleans up with the scripts from staging', () => {
        const cleanup = readFileSync('.github/workflows/visual-cleanup.yml', 'utf8');
        expect(cleanup).toContain('pull_request:');
        expect(cleanup).not.toMatch(/^\s+pull_request_target:/m);
        expect(cleanup).toContain('types: [closed]');
        expect(cleanup).toContain('branches: [staging]');
        expect(cleanup).toContain('ref: ${{ github.event.pull_request.base.ref }}');
    });
});

describe('visual-check workflow', () => {
    it('reports a cancelled or timed out run', () => {
        expect(readFileSync('.github/workflows/visual-check.yml', 'utf8')).toContain('if: failure() || cancelled()');
    });
});
