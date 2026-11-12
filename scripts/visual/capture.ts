import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';

import { type Browser, chromium, errors, type Page } from 'playwright-core';

import {
    BROWSER_LOCALES,
    CHROMIUM_ARGS,
    CONCURRENCY,
    EARLY_STOP_AFTER,
    HOST_RESOLVER_RULES,
    RENDER_TIMEOUT_MS,
    STABLE_FRAME_ATTEMPTS,
    STABLE_FRAME_DELAY_MS,
    WIDTHS,
} from './config';
import { decodePng, hashRaw } from './images';
import { runPool } from './pool';
import type { CaptureRecord, CaptureTarget } from './types';

// The CPU this runs on. Two runners can smooth edges differently, so the log names the machine behind each capture.
const cpuModel = cpus()[0]?.model.trim();
export const MACHINE = cpuModel ? cpuModel : 'unknown';

type StoryStatus = { state: 'pending' | 'rendered' | 'failed'; error: string | null };
type StoryChannel = {
    on: (
        event: string,
        listener: (
            payload?: { message?: string; title?: string; description?: string } | { message?: string; title?: string; description?: string }[],
        ) => void,
    ) => void;
};

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
        channel.on('storyMissing', () => fail('Story not found, or its file failed to load'));
        for (const event of ['storyThrewException', 'storyErrored', 'playFunctionThrewException', 'unhandledErrorsWhilePlaying']) {
            channel.on(event, (payload) => {
                const first = Array.isArray(payload) ? payload[0] : payload;
                fail(`${event}: ${first?.message ?? first?.description ?? first?.title ?? ''}`);
            });
        }
    };
    attach();
}

// Without a running frame loop, a full-page screenshot can now and then draw the page with some responsive rules
// off, even though the page itself is right. In 400 tries of FeedPageSkeleton under load, about 1 shot in 25 came
// out wrong without this and none with it.
function keepFramesRunning() {
    const frame = () => requestAnimationFrame(frame);
    requestAnimationFrame(frame);
}

export const launchBrowser = () => chromium.launch({ args: [`--host-resolver-rules=${HOST_RESOLVER_RULES}`, ...CHROMIUM_ARGS] });

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

type Shot = { png: Buffer } | { error: string; retry: boolean };

async function waitOrExplain(wait: Promise<unknown>, what: string) {
    try {
        await wait;
    } catch (error) {
        throw error instanceof errors.TimeoutError ? new Error(`Timed out waiting for ${what}`) : error;
    }
}

// Storybook only reports uncaught errors while a play function runs, so the page's own errors count too.
async function storyError(page: Page, pageErrors: string[]): Promise<string | null> {
    if (pageErrors.length > 0) return `Uncaught error: ${pageErrors[0]}`;
    const { status, errorPage } = await page.evaluate(() => ({
        status: window.__visualStatus,
        errorPage: document.body.classList.contains('sb-show-errordisplay'),
    }));
    if (status.state === 'failed') return status.error ?? 'Story failed';
    return errorPage ? 'Storybook is showing its error page' : null;
}

async function shoot(browser: Browser, origin: string, target: CaptureTarget): Promise<Shot> {
    const size = WIDTHS.find((width) => width.name === target.width);
    if (!size) return { error: `Unknown width ${target.width}`, retry: false };
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
        const pageErrors: string[] = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        await page.addInitScript(watchStory);
        await page.addInitScript(keepFramesRunning);
        await page.goto(`${origin}/iframe.html?id=${encodeURIComponent(target.storyId)}&viewMode=story&globals=locale:${target.locale}`);
        await waitOrExplain(
            page.waitForFunction(() => window.__visualStatus.state !== 'pending'),
            'the story to render',
        );
        const thrown = await storyError(page, pageErrors);
        if (thrown) return { error: thrown, retry: false };
        // next/image lazy-loads by default, which would leave holes in a full-page capture.
        await page.evaluate(() => {
            document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => {
                image.loading = 'eager';
            });
        });
        await waitOrExplain(
            page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.images].every((image) => image.complete)),
            'fonts and images',
        );
        // A failed font or image also counts as finished, so check that they actually loaded.
        const broken = await page.evaluate(() => ({
            fonts: [...document.fonts].filter((font) => font.status === 'error').map((font) => font.family),
            images: [...document.images].filter((image) => image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
        }));
        if (broken.fonts.length > 0) return { error: `Font failed to load: ${broken.fonts[0]}`, retry: true };
        if (broken.images.length > 0) return { error: `Image failed to load: ${broken.images[0]}`, retry: true };
        // Save my date tints a photo background once the browser has measured it.
        await waitOrExplain(
            page.waitForFunction(() => !document.querySelector('[data-photo-tone="pending"]')),
            'photo backgrounds to be measured',
        );
        const png = await stableFrame(page);
        // A story can throw after it has rendered, and Storybook then replaces it with its error page.
        const late = await storyError(page, pageErrors);
        if (late) return { error: late, retry: false };
        return png ? { png } : { error: 'Never stopped changing', retry: true };
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error), retry: true };
    } finally {
        await context.close();
    }
}

// A thrown error is the story's fault, so it isn't retried. Anything else can be a busy runner or a network blip.
export async function captureTarget(browser: Browser, origin: string, target: CaptureTarget, outDir: string): Promise<CaptureRecord> {
    let result = await shoot(browser, origin, target);
    if ('error' in result && result.retry) result = await shoot(browser, origin, target);
    if ('error' in result) return { ...target, status: 'failed', hash: null, error: result.error, machine: MACHINE };
    writeFileSync(join(outDir, `${target.id}.png`), result.png);
    return { ...target, status: 'ok', hash: hashRaw(await decodePng(result.png)), error: null, machine: MACHINE };
}

export const allFailedSoFar = (done: number, failed: number) => done === EARLY_STOP_AFTER && failed === done;

export async function captureAll(browser: Browser, origin: string, targets: CaptureTarget[], outDir: string): Promise<CaptureRecord[]> {
    mkdirSync(outDir, { recursive: true });
    let done = 0;
    let failed = 0;
    let firstError = '';
    return runPool(targets, CONCURRENCY, async (target) => {
        const record = await captureTarget(browser, origin, target, outDir);
        done += 1;
        if (record.status === 'failed') {
            failed += 1;
            firstError = firstError || (record.error ?? '');
        }
        // Every capture failing means the build is broken, not the stories. Stopping here avoids running out the job's time limit.
        if (allFailedSoFar(done, failed)) throw new Error(`The first ${done} captures all failed, so the run stopped. First error: ${firstError}`);
        if (done % 100 === 0 || done === targets.length) process.stdout.write(`Captured ${done}/${targets.length}\n`);
        return record;
    });
}
