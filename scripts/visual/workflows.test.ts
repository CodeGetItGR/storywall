// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { devDependencies: Record<string, string> }).devDependencies['playwright-core'];
const container = `container: mcr.microsoft.com/playwright:v${version}-noble`;

// A Windows checkout can have CRLF line endings.
const read = (name: string) => readFileSync(`.github/workflows/${name}.yml`, 'utf8').replace(/\r\n/g, '\n');

const JOB_LINE = /^ {4}([a-z-]+):$/gm;

const jobNames = (workflow: string) => [...workflow.slice(workflow.indexOf('\njobs:\n')).matchAll(JOB_LINE)].map((match) => match[1]);

// The text of one job, from its name to the next job.
function job(workflow: string, name: string): string {
    const jobs = workflow.slice(workflow.indexOf('\njobs:\n'));
    const start = jobs.indexOf(`\n    ${name}:\n`);
    if (start === -1) throw new Error(`No job named ${name}`);
    const rest = jobs.slice(start + 1);
    const next = rest.slice(1).search(/\n {4}[a-z-]+:\n/);
    return next === -1 ? rest : rest.slice(0, next + 1);
}

describe.each(['visual-check', 'visual-baseline'])('%s workflow', (name) => {
    const workflow = read(name);

    it('uses the container matching playwright-core', () => {
        expect(workflow).toContain(container);
    });

    it('uses the same Playwright version in the cache key', () => {
        expect(workflow).toContain(`-pw${version}`);
    });

    it('keeps every cache step in the Playwright container, so a saved cache can be found again', () => {
        const withCache = jobNames(workflow).filter((jobName) => job(workflow, jobName).includes('actions/cache/'));
        expect(withCache.length).toBeGreaterThan(0);
        for (const jobName of withCache) expect(job(workflow, jobName), jobName).toContain(container);
    });

    it('captures in 6 shares', () => {
        const capture = job(workflow, 'capture');
        expect(capture).toContain('share: [1, 2, 3, 4, 5, 6]');
        expect(capture).toContain('SHARE: ${{ strategy.job-index }}/${{ strategy.job-total }}');
        expect(capture).toContain('--share "$SHARE"');
    });
});

describe('cache key', () => {
    it('hashes the same capture files in both workflows', () => {
        const hashes = ['visual-check', 'visual-baseline'].flatMap((name) => read(name).match(/hashFiles\([^)]*\)/g) ?? []);
        expect(hashes).toEqual([
            "hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts')",
            "hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts')",
        ]);
    });
});

describe('base build for the recheck', () => {
    it('ends every cache key with -sb, so a cache saved without the base build is never used', () => {
        for (const name of ['visual-check', 'visual-baseline']) {
            const keys = read(name).match(/key: visual-base-.*$/gm) ?? [];
            expect(keys.length, name).toBeGreaterThan(0);
            for (const key of keys) expect(key.endsWith(`-pw${version}-sb`), key).toBe(true);
        }
    });

    it('keeps the base build in the saved base folder', () => {
        const compare = job(read('visual-check'), 'compare');
        expect(compare).toMatch(/name: visual-base-storybook\n\s+path: visual-output\/base\/storybook\n/);
        expect(compare).toContain('join --storybook visual-output/base/storybook --dir visual-output/base');
        const save = job(read('visual-baseline'), 'save');
        expect(save).toMatch(/name: visual-storybook\n\s+path: visual-output\/base\/storybook\n/);
        expect(save).toContain('join --storybook visual-output/base/storybook --dir visual-output/base');
    });

    it('captures the base shares from a build outside the base folder, because a share clears that folder first', () => {
        expect(job(read('visual-check'), 'capture')).toContain('--storybook visual-output/base-storybook --out visual-output/base');
    });
});

describe('deploy key', () => {
    it('publishes with the scripts from the base commit', () => {
        const publish = job(read('visual-check'), 'publish');
        expect(publish).toContain('ref: ${{ github.event.pull_request.base.sha }}');
        expect(publish).not.toContain('head.sha');
    });

    it('never builds in the job that holds the deploy key', () => {
        expect(job(read('visual-check'), 'publish')).not.toMatch(/\b(npm|npx|pnpm|yarn|vite)\b/);
    });

    it('cleans up with the scripts from staging', () => {
        const cleanup = read('visual-cleanup');
        expect(cleanup).toContain('pull_request:');
        expect(cleanup).not.toMatch(/^\s+pull_request_target:/m);
        expect(cleanup).toContain('types: [closed]');
        expect(cleanup).toContain('branches: [staging]');
        expect(cleanup).toContain('ref: ${{ github.event.pull_request.base.ref }}');
    });
});

describe('visual-check workflow', () => {
    const check = read('visual-check');

    it('reports a cancelled or timed out run', () => {
        expect(job(check, 'finish')).toContain('if: failure() || cancelled()');
    });

    it('reports a failure in any job', () => {
        expect(job(check, 'finish')).toContain('needs: [start, build, capture, compare, publish]');
    });

    it('takes the base from the PR event, so a merge that lands meanwhile cannot move it', () => {
        const build = job(check, 'build');
        expect(build).toContain('git merge-base "$EVENT_BASE_SHA" HEAD');
        expect(build).toContain('EVENT_BASE_SHA: ${{ github.event.pull_request.base.sha }}');
        expect(check).not.toContain('origin/$BASE_REF');
    });

    it.each(['build', 'capture', 'compare'])('gives %s, which runs PR code, read access only and no secrets', (name) => {
        const block = job(check, name);
        expect(block).toMatch(/permissions:\n\s+contents: read\n/);
        expect(block).not.toMatch(/: write\b/);
        expect(block).not.toContain('secrets.');
        expect(block).toContain('persist-credentials: false');
    });

    it('gives compare time to capture the whole base itself when its saved captures were dropped', () => {
        expect(job(check, 'compare')).toContain('timeout-minutes: 60');
    });

    it('compares only after every share is captured, and publishes after that', () => {
        expect(job(check, 'compare')).toContain('needs: [build, capture]');
        expect(job(check, 'publish')).toContain('needs: compare');
    });

    it('fails when the committed report page is out of date', () => {
        const build = job(check, 'build');
        expect(build).toContain('npm run visual:page');
        expect(build).toContain('git status --porcelain -- scripts/visual/report/dist)');
        expect(build).toContain('exit 1');
        expect(build.indexOf('npm ci')).toBeLessThan(build.indexOf('npm run visual:page'));
    });

    it('skips the page check on a branch from before the built page', () => {
        const build = job(check, 'build');
        const guard = build.indexOf('if [ ! -f scripts/visual/report/vite.config.ts ]; then');
        expect(guard).toBeGreaterThan(-1);
        expect(guard).toBeLessThan(build.indexOf('npm run visual:page'));
        expect(build).toContain('::notice::This branch has no report page source yet, so the page check is skipped.');
    });
});

describe('visual-baseline workflow', () => {
    const baseline = read('visual-baseline');

    it('captures only when the base is not saved yet', () => {
        expect(job(baseline, 'capture')).toContain("if: needs.build.outputs.saved != 'true'");
    });

    it('saves after every share is captured', () => {
        expect(job(baseline, 'save')).toContain('needs: [build, capture]');
    });
});
