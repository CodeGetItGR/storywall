import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { waitForAssets } from './waitForAssets';

type FakeFonts = { status: 'loading' | 'loaded'; ready: Promise<void> };

function fakeFonts(): { fonts: FakeFonts; finish: () => void } {
    let finish = () => {};
    const fonts: FakeFonts = {
        status: 'loading',
        ready: new Promise<void>((resolve) => {
            finish = () => {
                fonts.status = 'loaded';
                resolve();
            };
        }),
    };
    return { fonts, finish };
}

function addImage({ complete, lazy = false }: { complete: boolean; lazy?: boolean }) {
    const image = document.createElement('img');
    if (lazy) image.setAttribute('loading', 'lazy');
    let done = complete;
    Object.defineProperty(image, 'complete', { get: () => done });
    document.body.append(image);
    return {
        image,
        load: () => {
            done = true;
            image.dispatchEvent(new Event('load'));
        },
        fail: () => {
            done = true;
            image.dispatchEvent(new Event('error'));
        },
    };
}

// Resolves when the promise settles within the given time, without waiting for it otherwise.
async function settlesWithin(promise: Promise<void>, ms: number) {
    let settled = false;
    void promise.then(() => {
        settled = true;
    });
    await vi.advanceTimersByTimeAsync(ms);
    return settled;
}

describe('waitForAssets', () => {
    let finishFonts: () => void;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
        const { fonts, finish } = fakeFonts();
        finishFonts = finish;
        Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('waits for fonts that are still loading', async () => {
        const wait = waitForAssets();
        expect(await settlesWithin(wait, 500)).toBe(false);
        finishFonts();
        expect(await settlesWithin(wait, 200)).toBe(true);
    });

    it('waits for an image that is still loading', async () => {
        finishFonts();
        const photo = addImage({ complete: false });
        const wait = waitForAssets();
        expect(await settlesWithin(wait, 500)).toBe(false);
        photo.load();
        expect(await settlesWithin(wait, 200)).toBe(true);
    });

    it('counts a broken image as settled, so the capture can report it', async () => {
        finishFonts();
        const photo = addImage({ complete: false });
        const wait = waitForAssets();
        photo.fail();
        expect(await settlesWithin(wait, 200)).toBe(true);
    });

    it('loads lazy images at once', async () => {
        finishFonts();
        const { image } = addImage({ complete: true, lazy: true });
        await settlesWithin(waitForAssets(), 200);
        expect(image.getAttribute('loading')).toBe('eager');
    });

    it('also loads a lazy image added after the story first draws', async () => {
        finishFonts();
        const first = addImage({ complete: false });
        const wait = waitForAssets();
        await vi.advanceTimersByTimeAsync(100);
        const { image: late } = addImage({ complete: false, lazy: true });
        first.load();
        await vi.advanceTimersByTimeAsync(100);
        expect(late.getAttribute('loading')).toBe('eager');
        expect(await settlesWithin(wait, 200)).toBe(false);
    });

    it('does not wait for an image that left the page before it loaded', async () => {
        finishFonts();
        const { image } = addImage({ complete: false });
        const wait = waitForAssets();
        await vi.advanceTimersByTimeAsync(100);
        image.remove();
        expect(await settlesWithin(wait, 200)).toBe(true);
    });

    it('gives up after the time limit', async () => {
        addImage({ complete: false });
        const wait = waitForAssets(1_000);
        expect(await settlesWithin(wait, 900)).toBe(false);
        expect(await settlesWithin(wait, 200)).toBe(true);
    });
});
