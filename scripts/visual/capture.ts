import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Browser, chromium, type Page } from 'playwright-core';

import { BROWSER_LOCALES, CONCURRENCY, HOST_RESOLVER_RULES, RENDER_TIMEOUT_MS, STABLE_FRAME_ATTEMPTS, STABLE_FRAME_DELAY_MS, WIDTHS } from './config';
import { decodePng, hashRaw } from './images';
import { runPool } from './pool';
import type { CaptureRecord, CaptureTarget } from './types';

type StoryStatus = { state: 'pending' | 'rendered' | 'failed'; error: string | null };
type StoryChannel = { on: (event: string, listener: (payload?: { message?: string; title?: string } | { message?: string }[]) => void) => void };

declare global {
    interface Window {
        __visualStatus: StoryStatus;
        __STORYBOOK_ADDONS_CHANNEL__?: StoryChannel;
    }
}

// Runs before Storybook starts. It records the story's outcome from Storybook's own events.
function watchStory() {
    const status: StoryStatus = { state: 'pending', error: null };
    window.__visualStatus = status;
    const fail = (message: string) => {
        status.state = 'failed';
        status.error = status.error ?? message;
    };
    const attach = () => {
        const channel = window.__STORYBOOK_ADDONS_CHANNEL__;
        if (!channel) {
            setTimeout(attach, 5);
            return;
        }
        channel.on('storyRendered', () => {
            if (status.state === 'pending') status.state = 'rendered';
        });
        channel.on('storyMissing', () => fail('Story not found'));
        for (const event of ['storyThrewException', 'storyErrored', 'playFunctionThrewException', 'unhandledErrorsWhilePlaying']) {
            channel.on(event, (payload) => {
                const first = Array.isArray(payload) ? payload[0] : payload;
                fail(`${event}: ${first?.message ?? ''}`);
            });
        }
    };
    attach();
}

export const launchBrowser = () => chromium.launch({ args: [`--host-resolver-rules=${HOST_RESOLVER_RULES}`] });

const takeFrame = (page: Page) => page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css' });

// Two identical frames in a row. Never waits for network idle: some stories mock a request that never answers.
async function stableFrame(page: Page): Promise<Buffer | null> {
    let previous = await takeFrame(page);
    for (let attempt = 0; attempt < STABLE_FRAME_ATTEMPTS; attempt += 1) {
        await page.waitForTimeout(STABLE_FRAME_DELAY_MS);
        const current = await takeFrame(page);
        if (current.equals(previous)) return current;
        previous = current;
    }
    return null;
}

async function shoot(browser: Browser, origin: string, target: CaptureTarget): Promise<{ png: Buffer } | { error: string }> {
    const size = WIDTHS.find((width) => width.name === target.width);
    if (!size) return { error: `Unknown width ${target.width}` };
    // A fresh context per capture, so nothing in localStorage leaks between stories.
    const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        colorScheme: 'light',
        timezoneId: 'Europe/Athens',
        locale: BROWSER_LOCALES[target.locale],
    });
    try {
        const page = await context.newPage();
        page.setDefaultTimeout(RENDER_TIMEOUT_MS);
        await page.addInitScript(watchStory);
        await page.goto(`${origin}/iframe.html?id=${encodeURIComponent(target.storyId)}&viewMode=story&globals=locale:${target.locale}`);
        await page.waitForFunction(() => window.__visualStatus.state !== 'pending');
        const status = await page.evaluate(() => window.__visualStatus);
        if (status.state === 'failed') return { error: status.error ?? 'Story failed' };
        // next/image lazy-loads by default, which would leave holes in a full-page capture.
        await page.evaluate(() => {
            document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => {
                image.loading = 'eager';
            });
        });
        await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.images].every((image) => image.complete));
        const png = await stableFrame(page);
        return png ? { png } : { error: 'Never stopped changing' };
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    } finally {
        await context.close();
    }
}

// A failure is tried once more, because a timeout on a busy runner isn't a broken story.
export async function captureTarget(browser: Browser, origin: string, target: CaptureTarget, outDir: string): Promise<CaptureRecord> {
    let result = await shoot(browser, origin, target);
    if ('error' in result) result = await shoot(browser, origin, target);
    if ('error' in result) return { ...target, status: 'failed', hash: null, error: result.error };
    writeFileSync(join(outDir, `${target.id}.png`), result.png);
    return { ...target, status: 'ok', hash: hashRaw(await decodePng(result.png)), error: null };
}

export async function captureAll(browser: Browser, origin: string, targets: CaptureTarget[], outDir: string): Promise<CaptureRecord[]> {
    mkdirSync(outDir, { recursive: true });
    let done = 0;
    return runPool(targets, CONCURRENCY, async (target) => {
        const record = await captureTarget(browser, origin, target, outDir);
        done += 1;
        if (done % 100 === 0 || done === targets.length) process.stdout.write(`Captured ${done}/${targets.length}\n`);
        return record;
    });
}
