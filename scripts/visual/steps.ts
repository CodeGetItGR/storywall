// Steps shared by the local commands in run.ts and the CI steps in ci.ts.

import { execFileSync, execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Browser } from 'playwright-core';

import { captureAll, captureTarget, launchBrowser } from './capture';
import { findMissingStories } from './missingStories';
import { buildReport } from './report';
import { serveStatic } from './server';
import { buildCaptureList, type StoryIndex } from './stories';
import type { CaptureRecord } from './types';

export const OUT = 'visual-output';
export const BASE_DIR = join(OUT, 'base');
export const HEAD_DIR = join(OUT, 'head');
export const REPORT_DIR = join(OUT, 'report');
export const BASE_STORYBOOK_DIR = join(OUT, 'base-storybook');
export const STORYBOOK_DIR = 'storybook-static';

export const print = (line: string) => process.stdout.write(`${line}\n`);

export const git = (...gitArgs: string[]) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();

export function buildStorybook(cwd: string, outDir: string) {
    execSync(`npx storybook build --quiet -o "${outDir}"`, { cwd, stdio: 'inherit', env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: '1' } });
}

export function targetsFrom(storybookDir: string) {
    return buildCaptureList(JSON.parse(readFileSync(join(storybookDir, 'index.json'), 'utf8')) as StoryIndex);
}

export function saveRecords(dir: string, records: CaptureRecord[], sha: string) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'captures.json'), JSON.stringify(records));
    writeFileSync(join(dir, 'sha.txt'), sha);
}

export const readRecords = (dir: string) => JSON.parse(readFileSync(join(dir, 'captures.json'), 'utf8')) as CaptureRecord[];

// Serves a built Storybook to a new browser for as long as `work` runs.
export async function withStorybook<Result>(storybookDir: string, work: (browser: Browser, origin: string) => Promise<Result>): Promise<Result> {
    const browser = await launchBrowser();
    try {
        const server = await serveStatic(storybookDir);
        try {
            return await work(browser, server.origin);
        } finally {
            await server.close();
        }
    } finally {
        await browser.close();
    }
}

export async function captureBuild(browser: Browser, storybookDir: string, outDir: string): Promise<CaptureRecord[]> {
    const server = await serveStatic(storybookDir);
    try {
        return await captureAll(browser, server.origin, targetsFrom(storybookDir), outDir);
    } finally {
        await server.close();
    }
}

// Builds a commit's Storybook in a temporary worktree. Returns false for a commit from before Storybook existed.
export function buildCommitStorybook(sha: string, outDir: string): boolean {
    const source = resolve(OUT, 'base-src');
    rmSync(source, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
    git('worktree', 'prune');
    git('worktree', 'add', '--detach', source, sha);
    try {
        if (!existsSync(join(source, '.storybook', 'main.ts'))) return false;
        execSync('npm ci', { cwd: source, stdio: 'inherit' });
        buildStorybook(source, resolve(outDir));
        return true;
    } finally {
        // A locked file on Windows must not hide the real error.
        try {
            git('worktree', 'remove', '--force', source);
        } catch (error) {
            console.warn(`Could not remove the temporary worktree ${source}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

// Reuses saved captures when they belong to this commit. Otherwise builds and captures that commit.
// A commit from before Storybook existed has no captures, so all stories count as new.
export async function loadOrBuildBase(browser: Browser, baseSha: string): Promise<CaptureRecord[]> {
    const shaFile = join(BASE_DIR, 'sha.txt');
    if (existsSync(shaFile) && readFileSync(shaFile, 'utf8').trim() === baseSha) {
        print(`Using saved captures for ${baseSha}`);
        return readRecords(BASE_DIR);
    }
    print(`Building captures for ${baseSha}`);
    rmSync(BASE_DIR, { recursive: true, force: true });
    mkdirSync(BASE_DIR, { recursive: true });
    const records = buildCommitStorybook(baseSha, BASE_STORYBOOK_DIR) ? await captureBuild(browser, BASE_STORYBOOK_DIR, BASE_DIR) : [];
    saveRecords(BASE_DIR, records, baseSha);
    return records;
}

// Compares the head captures with the base and writes the report. `origin` serves the head build, for retakes.
export async function writeReport(browser: Browser, origin: string, headRecords: CaptureRecord[], baseSha: string) {
    const headSha = git('rev-parse', 'HEAD');
    rmSync(REPORT_DIR, { recursive: true, force: true });
    const baseRecords = await loadOrBuildBase(browser, baseSha);
    const added = git('diff', '--diff-filter=A', '--name-only', baseSha, 'HEAD').split('\n').filter(Boolean);
    const manifest = await buildReport({
        baseDir: BASE_DIR,
        headDir: HEAD_DIR,
        reportDir: REPORT_DIR,
        baseRecords,
        headRecords,
        baseSha,
        headSha,
        missingStories: findMissingStories(added, existsSync),
        retake: (target) => captureTarget(browser, origin, target, HEAD_DIR),
    });
    copyFileSync(join('scripts', 'visual', 'report', 'dist', 'index.html'), join(REPORT_DIR, 'index.html'));
    const { changed, removed, failed } = manifest.counts;
    print(`${changed} changed, ${manifest.counts.new} new, ${removed} removed, ${failed} failed, of ${manifest.totalCaptures} captures.`);
    for (const entry of manifest.entries.filter((item) => item.state === 'failed')) print(`FAILED ${entry.id}: ${entry.error}`);
}
