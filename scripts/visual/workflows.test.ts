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
