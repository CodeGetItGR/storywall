// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Browser } from 'playwright-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureTarget } from './capture';
import type { BaseRecheck } from './report';
import { withBaseRecheck, writeBuildCommit } from './steps';
import type { CaptureTarget } from './types';

vi.mock('./capture', async (importOriginal) => ({ ...(await importOriginal<typeof import('./capture')>()), captureTarget: vi.fn() }));

const BASE_SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

// Hands back the recheck `withBaseRecheck` gave the work, so a test can look at it.
const given = async (recheck: BaseRecheck | undefined) => recheck;

describe('withBaseRecheck', () => {
    let root: string;
    // Nothing is captured in these tests, so the browser is never used.
    const browser = {} as Browser;

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'visual-steps-'));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(root, { recursive: true, force: true });
    });

    // A base build with a story index, and the commit it says it was built from.
    function baseBuild(commit?: string): string {
        const storybook = join(root, 'storybook');
        mkdirSync(storybook);
        writeFileSync(join(storybook, 'index.json'), JSON.stringify({ v: 5, entries: {} }));
        if (commit) writeFileSync(join(storybook, 'commit.txt'), commit);
        return storybook;
    }

    it('gives no recheck without a base build', async () => {
        const log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        expect(await withBaseRecheck(browser, undefined, BASE_SHA, join(root, 'recheck'), given)).toBeUndefined();
        expect(log).not.toHaveBeenCalledWith(expect.stringContaining('No base recheck'));
    });

    it('gives no recheck when the base build has no story index', async () => {
        const log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const storybook = join(root, 'storybook');
        mkdirSync(storybook);
        expect(await withBaseRecheck(browser, storybook, BASE_SHA, join(root, 'recheck'), given)).toBeUndefined();
        expect(log).toHaveBeenCalledWith(`No base recheck: no base build in ${storybook}
`);
    });

    it('gives no recheck when the base build folder does not exist', async () => {
        const log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const missing = join(root, 'missing');
        expect(await withBaseRecheck(browser, missing, BASE_SHA, join(root, 'recheck'), given)).toBeUndefined();
        expect(log).toHaveBeenCalledWith(`No base recheck: no base build in ${missing}
`);
    });

    it('passes on the error when the work fails', async () => {
        const storybook = baseBuild(BASE_SHA);
        await expect(
            withBaseRecheck(browser, storybook, BASE_SHA, join(root, 'recheck'), async () => {
                throw new Error('report failed');
            }),
        ).rejects.toThrow('report failed');
    });

    it('gives no recheck when the base build is from another commit', async () => {
        const log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const storybook = baseBuild(OTHER_SHA);
        expect(await withBaseRecheck(browser, storybook, BASE_SHA, join(root, 'recheck'), given)).toBeUndefined();
        expect(log).toHaveBeenCalledWith(`No base recheck: the base build is for ${OTHER_SHA}, not ${BASE_SHA}\n`);
    });

    it('gives no recheck when the base build does not say its commit', async () => {
        const log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const storybook = baseBuild();
        expect(await withBaseRecheck(browser, storybook, BASE_SHA, join(root, 'recheck'), given)).toBeUndefined();
        expect(log).toHaveBeenCalledWith(`No base recheck: the base build is for unknown, not ${BASE_SHA}\n`);
    });

    it('rechecks into an emptied folder of its own when the base build is from the base commit', async () => {
        const storybook = baseBuild(BASE_SHA);
        const recheckDir = join(root, 'recheck');
        mkdirSync(recheckDir);
        writeFileSync(join(recheckDir, 'old.png'), '');
        const recheck = await withBaseRecheck(browser, storybook, BASE_SHA, recheckDir, given);
        expect(recheck?.dir).toBe(recheckDir);
        expect(existsSync(recheckDir)).toBe(true);
        expect(existsSync(join(recheckDir, 'old.png'))).toBe(false);
    });

    it('captures the recheck from the base build into its own folder', async () => {
        const storybook = baseBuild(BASE_SHA);
        const recheckDir = join(root, 'recheck');
        const target: CaptureTarget = {
            id: 'a-story--default',
            storyId: 'a-story--default',
            title: 'A',
            name: 'Default',
            locale: 'en',
            width: 'desktop',
        };
        let fetched: string | undefined;
        vi.mocked(captureTarget).mockReset();
        vi.mocked(captureTarget).mockImplementation(async (_browser, origin, given) => {
            fetched = await (await fetch(`${origin}/commit.txt`)).text();
            return { ...given, status: 'ok', hash: 'hash', error: null };
        });
        await withBaseRecheck(browser, storybook, BASE_SHA, recheckDir, async (recheck) => recheck!.retake(target));
        expect(captureTarget).toHaveBeenCalledTimes(1);
        expect(captureTarget).toHaveBeenCalledWith(browser, expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+$/), target, recheckDir);
        expect(fetched).toBe(BASE_SHA);
        vi.mocked(captureTarget).mockReset();
    });
});

describe('writeBuildCommit', () => {
    it('writes the commit the build was made from', () => {
        const repo = mkdtempSync(join(tmpdir(), 'visual-commit-'));
        try {
            execFileSync('git', ['init', '-q'], { cwd: repo });
            execFileSync(
                'git',
                [
                    '-c',
                    'user.email=test@example.com',
                    '-c',
                    'user.name=test',
                    '-c',
                    'commit.gpgsign=false',
                    'commit',
                    '-q',
                    '--allow-empty',
                    '-m',
                    'base',
                ],
                {
                    cwd: repo,
                },
            );
            mkdirSync(join(repo, 'out'));
            writeBuildCommit(repo, 'out');
            expect(readFileSync(join(repo, 'out', 'commit.txt'), 'utf8')).toBe(
                execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
            );
        } finally {
            rmSync(repo, { recursive: true, force: true });
        }
    });
});
