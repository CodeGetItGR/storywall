// Captures Storybook and compares it with another commit.
//
//   npm run visual -- --base origin/staging           compare HEAD with where it branched
//   npm run visual -- --base origin/staging --serve   and open the report on a local server
//   npm run visual -- --capture-only                  save HEAD as visual-output/base
//
// Windows renders differently from CI, so a local run only compares with itself.
// CI runs the same steps split across jobs, through ci.ts.

import { rmSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { captureAll, launchBrowser } from './capture';
import { serveStatic } from './server';
import { BASE_DIR, buildStorybook, captureBuild, git, HEAD_DIR, print, REPORT_DIR, saveRecords, STORYBOOK_DIR, targetsFrom, withStorybook, writeReport } from './steps';

const { values: args } = parseArgs({
    options: {
        base: { type: 'string' },
        'capture-only': { type: 'boolean', default: false },
        serve: { type: 'boolean', default: false },
    },
});

async function captureOnly() {
    rmSync(BASE_DIR, { recursive: true, force: true });
    buildStorybook('.', STORYBOOK_DIR);
    const browser = await launchBrowser();
    try {
        saveRecords(BASE_DIR, await captureBuild(browser, STORYBOOK_DIR, BASE_DIR), git('rev-parse', 'HEAD'));
    } finally {
        await browser.close();
    }
}

async function compareWithBase(baseRef: string) {
    const baseSha = git('merge-base', baseRef, 'HEAD');
    rmSync(HEAD_DIR, { recursive: true, force: true });
    buildStorybook('.', STORYBOOK_DIR);
    await withStorybook(STORYBOOK_DIR, async (browser, origin) => {
        const headRecords = await captureAll(browser, origin, targetsFrom(STORYBOOK_DIR), HEAD_DIR);
        await writeReport(browser, origin, headRecords, baseSha);
    });

    if (args.serve) {
        const reportServer = await serveStatic(REPORT_DIR);
        print(`Report: ${reportServer.origin}/index.html (Ctrl+C to stop)`);
    }
}

async function main() {
    if (args['capture-only']) return captureOnly();
    if (!args.base) throw new Error('Pass --base <ref> or --capture-only');
    return compareWithBase(args.base);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
