import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PhotoTone } from '@/lib/invitation/photoContrast';
import { measurePhoto, readPhotoTone, requestPhotoTones, resetPhotoTones, subscribePhotoTones } from '@/lib/invitation/photoToneStore';

const LIGHT: PhotoTone = { mean: 0.6, dark: 0.5, light: 0.9 };
const DARK: PhotoTone = { mean: 0.02, dark: 0.01, light: 0.06 };

afterEach(resetPhotoTones);

describe('photo tone store', () => {
    it('has no tone until every photo is measured', async () => {
        const measure = vi.fn(async (url: string) => (url === 'light.jpg' ? LIGHT : DARK));
        requestPhotoTones(['light.jpg', 'dark.jpg'], measure);
        expect(readPhotoTone(['light.jpg', 'dark.jpg'])).toBeUndefined();
        await vi.waitFor(() => expect(readPhotoTone(['light.jpg', 'dark.jpg'])).toEqual({ mean: expect.closeTo(0.31, 5), dark: 0.01, light: 0.9 }));
    });

    it('measures each photo once', async () => {
        const measure = vi.fn(async () => LIGHT);
        requestPhotoTones(['a.jpg'], measure);
        requestPhotoTones(['a.jpg'], measure);
        await vi.waitFor(() => expect(readPhotoTone(['a.jpg'])).toEqual(LIGHT));
        requestPhotoTones(['a.jpg'], measure);
        expect(measure).toHaveBeenCalledTimes(1);
    });

    it('gives the same tone object on every read, as useSyncExternalStore needs', async () => {
        requestPhotoTones(['a.jpg', 'b.jpg'], async () => LIGHT);
        await vi.waitFor(() => expect(readPhotoTone(['a.jpg', 'b.jpg'])).toBeDefined());
        expect(readPhotoTone(['a.jpg', 'b.jpg'])).toBe(readPhotoTone(['a.jpg', 'b.jpg']));
    });

    it('marks a photo it could not measure', async () => {
        requestPhotoTones(['blocked.jpg', 'ok.jpg'], async (url) => (url === 'ok.jpg' ? LIGHT : undefined));
        await vi.waitFor(() => expect(readPhotoTone(['blocked.jpg', 'ok.jpg'])).toBeNull());
    });

    it('tells subscribers when a photo is measured, until they leave', async () => {
        const listener = vi.fn();
        const leave = subscribePhotoTones(listener);
        requestPhotoTones(['a.jpg'], async () => LIGHT);
        await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
        leave();
        requestPhotoTones(['b.jpg'], async () => LIGHT);
        await vi.waitFor(() => expect(readPhotoTone(['b.jpg'])).toEqual(LIGHT));
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe('measurePhoto', () => {
    it('gives up when the browser cannot decode or read the photo', async () => {
        // jsdom never decodes images.
        await expect(measurePhoto('/images/venue.png')).resolves.toBeUndefined();
    });
});
