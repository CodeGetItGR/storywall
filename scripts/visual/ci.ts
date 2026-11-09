// The visual check's CI steps. The workflows run them in separate jobs, so the captures can be
// split across runners. run.ts runs the same steps in one go for local use.
//
//   npm run visual:ci -- build                                              build HEAD's Storybook into storybook-static
//   npm run visual:ci -- build-base --base <sha>                            build that commit's Storybook into visual-output/base-storybook
//   npm run visual:ci -- capture --share 0/6 --storybook <dir> --out <dir>  capture one share of a build's stories
//   npm run visual:ci -- join --storybook <dir> --dir <dir> --sha <sha>     join the shares' records into captures.json
//   npm run visual:ci -- compare --base <sha>                               compare visual-output/head with the base and write the report

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { captureAll } from './capture';
import { joinShareFiles, parseShare, shareOf, writeShareRecords } from './shards';
import {
    BASE_STORYBOOK_DIR,
    buildCommitStorybook,
    buildStorybook,
    HEAD_DIR,
    print,
    readRecords,
    saveRecords,
    STORYBOOK_DIR,
    targetsFrom,
    withStorybook,
    writeReport,
} from './steps';

const { values: args, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        base: { type: 'string' },
        share: { type: 'string' },
        storybook: { type: 'string' },
        out: { type: 'string' },
        dir: { type: 'string' },
        sha: { type: 'string' },
    },
});

function required(name: keyof typeof args): string {
    const value = args[name];
    if (typeof value !== 'string' || value === '') throw new Error(`Pass --${name}`);
    return value;
}

// A commit from before Storybook existed gets an empty story list, so every head story counts as new.
function buildBase() {
    if (buildCommitStorybook(required('base'), BASE_STORYBOOK_DIR)) return;
    mkdirSync(BASE_STORYBOOK_DIR, { recursive: true });
    writeFileSync(join(BASE_STORYBOOK_DIR, 'index.json'), JSON.stringify({ v: 5, entries: {} }));
}

async function captureShare() {
    const share = parseShare(required('share'));
    const storybookDir = required('storybook');
    const outDir = required('out');
    rmSync(outDir, { recursive: true, force: true });
    const targets = shareOf(targetsFrom(storybookDir), share);
    print(`Share ${share.index + 1} of ${share.total}: ${targets.length} captures`);
    const records = await withStorybook(storybookDir, (browser, origin) => captureAll(browser, origin, targets, outDir));
    writeShareRecords(outDir, share.index, records);
}

function joinRecords() {
    const dir = required('dir');
    const joined = joinShareFiles(dir, targetsFrom(required('storybook')));
    saveRecords(dir, joined, required('sha'));
    print(`Joined ${joined.length} captures`);
}

async function compare() {
    const baseSha = required('base');
    const headRecords = readRecords(HEAD_DIR);
    await withStorybook(STORYBOOK_DIR, (browser, origin) => writeReport(browser, origin, headRecords, baseSha));
}

const steps: Record<string, () => unknown> = {
    build: () => buildStorybook('.', STORYBOOK_DIR),
    'build-base': buildBase,
    capture: captureShare,
    join: joinRecords,
    compare,
};

async function main() {
    const step = positionals.length === 1 ? steps[positionals[0]] : undefined;
    if (!step) throw new Error(`Pass one step: ${Object.keys(steps).join(', ')}`);
    await step();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
