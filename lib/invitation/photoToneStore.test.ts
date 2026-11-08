import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PhotoTone } from '@/lib/invitation/photoContrast';
import { measurePhoto, readPhotoTone, requestPhotoTone, resetPhotoTones, subscribePhotoTones } from '@/lib/invitation/photoToneStore';

const LIGHT: PhotoTone = { mean: 0.6, dark: 0.5, light: 0.9 };

afterEach(() => {
    resetPhotoTones();
    vi.unstubAllGlobals();
});

describe('photo tone store', () => {
    it('has no tone until the photo is measured', async () => {
        requestPhotoTone('light.jpg', async () => LIGHT);
        expect(readPhotoTone('light.jpg')).toBeUndefined();
        await vi.waitFor(() => expect(readPhotoTone('light.jpg')).toBe(LIGHT));
    });

    it('measures each photo once', async () => {
        const measure = vi.fn(async () => LIGHT);
        requestPhotoTone('a.jpg', measure);
        requestPhotoTone('a.jpg', measure);
        await vi.waitFor(() => expect(readPhotoTone('a.jpg')).toBe(LIGHT));
        requestPhotoTone('a.jpg', measure);
        expect(measure).toHaveBeenCalledTimes(1);
    });

    it('marks a photo it could not measure', async () => {
        requestPhotoTone('blocked.jpg', async () => undefined);
        await vi.waitFor(() => expect(readPhotoTone('blocked.jpg')).toBeNull());
    });

    it('tells subscribers when a photo is measured, until they leave', async () => {
        const listener = vi.fn();
        const leave = subscribePhotoTones(listener);
        requestPhotoTone('a.jpg', async () => LIGHT);
        await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
        leave();
        requestPhotoTone('b.jpg', async () => LIGHT);
        await vi.waitFor(() => expect(readPhotoTone('b.jpg')).toBe(LIGHT));
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe('measurePhoto', () => {
    it('asks for a photo whose server refuses it only once', async () => {
        const fetch = vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        });
        vi.stubGlobal('fetch', fetch);
        const image = vi.spyOn(globalThis, 'Image');
        await expect(measurePhoto('https://cdn.test/no-cors.jpg')).resolves.toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith('https://cdn.test/no-cors.jpg', { mode: 'cors', credentials: 'omit' });
        expect(image).not.toHaveBeenCalled();
    });

    it('gives up on a missing photo', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
        await expect(measurePhoto('https://cdn.test/gone.jpg')).resolves.toBeUndefined();
    });

    it('gives up when the browser cannot decode the photo', async () => {
        // jsdom never decodes images.
        vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['not a photo'], { type: 'image/jpeg' }))));
        await expect(measurePhoto('https://cdn.test/broken.jpg')).resolves.toBeUndefined();
    });
});
