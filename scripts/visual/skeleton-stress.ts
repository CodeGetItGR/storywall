// Temporary: loads one story many times the way capture.ts does and records what the browser
// thinks when its layout flips. Deleted together with the stability test.

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { launchBrowser } from './capture';
import { CONCURRENCY, STABLE_FRAME_ATTEMPTS, STABLE_FRAME_DELAY_MS } from './config';
import { runPool } from './pool';
import { serveStatic } from './server';

const STORY = 'feed-feedpageskeleton--default';
const TRIES = 600;
const OUT = join('visual-output', 'skeleton');

type Sample = {
    try: number;
    locale: string;
    hash: string;
    size: string;
    state: Record<string, unknown>;
    viewportHash: string;
    attempts: number;
};

const sha = (data: Buffer) => createHash('sha1').update(data).digest('hex').slice(0, 8);

async function main() {
    mkdirSync(OUT, { recursive: true });
    const browser = await launchBrowser();
    const server = await serveStatic('storybook-static');
    const tries = Array.from({ length: TRIES }, (_, index) => index);
    const samples = await runPool(tries, CONCURRENCY, async (index): Promise<Sample> => {
        const locale = index % 2 === 0 ? 'en' : 'el';
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            deviceScaleFactor: 1,
            reducedMotion: 'reduce',
            colorScheme: 'light',
            timezoneId: 'Europe/Athens',
            locale: locale === 'el' ? 'el-GR' : 'en-US',
        });
        const page = await context.newPage();
        await page.goto(`${server.origin}/iframe.html?id=${STORY}&viewMode=story&globals=locale:${locale}`);
        await page.waitForFunction(() => document.querySelector('[data-slot="skeleton"]'));
        await page.waitForFunction(() => document.fonts.status === 'loaded');
        const shot = () => page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css' });
        let frame = await shot();
        let attempts = 0;
        for (; attempts < STABLE_FRAME_ATTEMPTS; attempts += 1) {
            await page.waitForTimeout(STABLE_FRAME_DELAY_MS);
            const current = await shot();
            const same = current.equals(frame);
            frame = current;
            if (same) break;
        }
        const state = await page.evaluate(() => {
            const first = document.querySelector('[data-slot="skeleton"]') as HTMLElement;
            const style = getComputedStyle(first);
            return {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                sm: matchMedia('(min-width:40rem)').matches,
                md: matchMedia('(min-width:48rem)').matches,
                lg: matchMedia('(min-width:64rem)').matches,
                height: style.height,
                width: style.width,
                rectHeight: first.getBoundingClientRect().height,
                scrollHeight: document.documentElement.scrollHeight,
                sheets: document.styleSheets.length,
                visibility: document.visibilityState,
            };
        });
        const viewportFrame = await page.screenshot({ animations: 'disabled', caret: 'hide', scale: 'css' });
        await context.close();
        const hash = sha(frame);
        writeFileSync(join(OUT, `${hash}.png`), frame);
        writeFileSync(join(OUT, `${hash}-viewport-${sha(viewportFrame)}.png`), viewportFrame);
        return {
            try: index,
            locale,
            hash,
            size: `${frame.readUInt32BE(16)}x${frame.readUInt32BE(20)}`,
            state,
            viewportHash: sha(viewportFrame),
            attempts,
        };
    });
    await server.close();
    await browser.close();

    const groups = new Map<string, Sample[]>();
    for (const sample of samples) groups.set(`${sample.locale} ${sample.hash} ${sample.viewportHash}`, [...(groups.get(`${sample.locale} ${sample.hash} ${sample.viewportHash}`) ?? []), sample]);
    for (const [key, group] of groups) {
        process.stdout.write(`${key} x${group.length} size=${group[0].size} first=${group[0].try} attempts=${group[0].attempts} ${JSON.stringify(group[0].state)}\n`);
    }
    writeFileSync(join(OUT, 'samples.json'), JSON.stringify(samples));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
