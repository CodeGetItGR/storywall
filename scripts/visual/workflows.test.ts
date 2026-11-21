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

    it('uses the -sb key and the base folder in every cache step', () => {
        const buildKey = { 'visual-check': 'base-key', 'visual-baseline': 'key' } as const;
        for (const name of ['visual-check', 'visual-baseline'] as const) {
            const workflow = read(name);
            const steps = workflow.split(/\n {12}- /).filter((step) => step.includes('actions/cache/') && !step.includes('visual-timings-'));
            expect(steps.length, name).toBeGreaterThan(0);
            const output = `${buildKey[name]}: \${{ steps.lookup.outputs.cache-primary-key }}`;
            expect(job(workflow, 'build'), name).toContain(output);
            for (const step of steps) {
                expect(step.match(/^\s+path: (.*)$/m)?.[1], step).toBe('visual-output/base');
                const key = step.match(/^\s+key: (.*)$/m)?.[1] ?? '';
                const derived = `\${{ needs.build.outputs.${buildKey[name]} }}`;
                expect(key === derived || (key.startsWith('visual-base-') && key.endsWith(`-pw${version}-sb`)), key).toBe(true);
            }
        }
    });

    it('keeps the base build in the saved base folder', () => {
        const report = job(read('visual-check'), 'report');
        expect(report).toMatch(/name: visual-base-storybook\n\s+path: visual-output\/base\/storybook\n/);
        expect(report).toContain('join --storybook visual-output/base/storybook --dir visual-output/base');
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
        expect(job(check, 'finish')).toContain('needs: [start, build, capture, report, publish]');
    });

    it('takes the base from the PR event, so a merge that lands meanwhile cannot move it', () => {
        const build = job(check, 'build');
        expect(build).toContain('git merge-base "$EVENT_BASE_SHA" HEAD');
        expect(build).toContain('EVENT_BASE_SHA: ${{ github.event.pull_request.base.sha }}');
        expect(check).not.toContain('origin/$BASE_REF');
    });

    it.each(['build', 'capture', 'report'])('gives %s, which runs PR code, read access only and no secrets', (name) => {
        const block = job(check, name);
        expect(block).toMatch(/permissions:\n\s+contents: read\n/);
        expect(block).not.toMatch(/: write\b/);
        expect(block).not.toContain('secrets.');
        if (block.includes('actions/checkout')) expect(block).toContain('persist-credentials: false');
    });

    it('lets only build and capture read Actions runs, to find and wait for the baseline run', () => {
        expect(job(check, 'build')).toMatch(/permissions:\n\s+contents: read\n\s+actions: read\n/);
        expect(job(check, 'capture')).toMatch(/permissions:\n\s+contents: read\n\s+actions: read\n/);
        expect(job(check, 'report')).not.toContain('actions: read');
    });

    it('joins the report only after every share has compared, and publishes after that', () => {
        expect(job(check, 'report')).toContain('needs: [build, capture]');
        expect(job(check, 'publish')).toContain('needs: report');
        expect(check).not.toMatch(/\n {4}compare:\n/);
    });

    it('runs npm ci only in the build job', () => {
        expect(job(check, 'build')).toContain('run: npm ci');
        for (const name of ['capture', 'report']) expect(job(check, name), name).not.toMatch(/\bnpm (ci|install|run)\b/);
    });

    it('packs the runtime in build and runs every later step from it', () => {
        const build = job(check, 'build');
        expect(build).toContain('node scripts/visual/pack.mjs');
        expect(build).toContain('node visual-runtime/ci.mjs selfcheck');
        expect(build).toMatch(/name: visual-runtime\n\s+path: visual-runtime\n/);
        for (const name of ['capture', 'report']) expect(job(check, name), name).toContain('node visual-runtime/ci.mjs');
    });

    it('plans the shares from the newest timings', () => {
        const build = job(check, 'build');
        expect(build).toContain('restore-keys: visual-timings-');
        expect(build).toContain('plan --storybook storybook-static --timings visual-output/timings/timings.json --out visual-runtime/share-plan.json');
        expect(job(check, 'capture')).toContain('--plan visual-runtime/share-plan.json');
        expect(job(check, 'report')).toContain('key: visual-timings-${{ github.run_id }}-${{ github.run_attempt }}');
    });

    it('works out the base state in build', () => {
        expect(job(check, 'build')).toContain('base-state --sha "$BASE_SHA" --cache-hit "$CACHE_HIT"');
    });

    it('waits up to 15 minutes for a baseline run that is still going', () => {
        const capture = job(check, 'capture');
        expect(capture).toContain("if: needs.build.outputs.base-state == 'pending'");
        expect(capture).toContain('wait-baseline --run "$BASELINE_RUN" --minutes 15');
        expect(capture.indexOf('wait-baseline')).toBeGreaterThan(capture.indexOf(' capture --share'));
    });

    it('captures its share of the base only when the cache still has none', () => {
        const capture = job(check, 'capture');
        expect(capture).toContain("if: needs.build.outputs.base-state != 'saved' && steps.restore.outputs.cache-hit != 'true'");
        expect(capture).toContain('capture-base --share "$SHARE" --plan visual-runtime/share-plan.json --storybook visual-output/base-storybook --out visual-output/base');
    });

    it('stops with a clear error when the saved base is gone and there is no base build to capture from', () => {
        const capture = job(check, 'capture');
        expect(capture).toContain("if: needs.build.outputs.base-state == 'saved' && steps.restore.outputs.cache-hit != 'true'");
        expect(capture).toContain('Use Re-run all jobs.');
        expect(capture.indexOf('Use Re-run all jobs.')).toBeGreaterThan(capture.indexOf('id: restore'));
        expect(capture.indexOf('Use Re-run all jobs.')).toBeLessThan(capture.indexOf('name: visual-base-storybook'));
        expect(capture.match(/needs.build.outputs.base-state != 'saved' && steps.restore/g)?.length).toBe(3);
        expect(capture).toContain('timeout-minutes: 55');
    });

    it('saves the timings under a key that is new on every attempt', () => {
        for (const name of ['visual-check', 'visual-baseline']) {
            const keys = read(name).match(/key: visual-timings-.*$/gm) ?? [];
            expect(keys.length, name).toBeGreaterThan(0);
            for (const key of keys) expect(key, name).toBe('key: visual-timings-${{ github.run_id }}-${{ github.run_attempt }}');
        }
    });

    it('compares in each share', () => {
        expect(job(check, 'capture')).toContain('compare-share --share "$SHARE"');
        expect(job(check, 'report')).toContain('join-report --plan visual-runtime/share-plan.json --storybook storybook-static --base "$BASE_SHA"');
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

    it('runs npm ci only in the build job, and only when the base is not saved', () => {
        expect(job(baseline, 'build')).toContain('run: npm ci');
        for (const name of ['capture', 'save']) expect(job(baseline, name), name).not.toMatch(/\bnpm (ci|install|run)\b/);
    });

    it('captures from the share plan with the runtime pack', () => {
        expect(job(baseline, 'build')).toContain('node scripts/visual/pack.mjs');
        expect(job(baseline, 'capture')).toContain(
            'node visual-runtime/ci.mjs capture --share "$SHARE" --plan visual-runtime/share-plan.json --storybook storybook-static --out visual-output/base',
        );
    });

    it('saves the timings for the next plan', () => {
        const save = job(baseline, 'save');
        expect(save).toContain('--timings visual-output/timings/timings.json');
        expect(save).toContain('key: visual-timings-${{ github.run_id }}-${{ github.run_attempt }}');
    });
});
