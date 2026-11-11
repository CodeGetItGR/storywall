import { describe, expect, it } from 'vitest';

import {
    colorLuminance,
    contrastRatio,
    isTextHardToReadOnPhoto,
    MAX_TINT_ALPHA,
    MOBILE_BACKGROUND_MAX_WIDTH,
    photoTextTint,
    type PhotoTone,
    photoToneFromPixels,
    READABLE_CONTRAST,
    shownPhoto,
    tintBackground,
    WHITE_TEXT_WORST_TINT,
} from '@/lib/invitation/photoContrast';

// Tones measured from the Storybook photos (32×32 samples).
const LIGHT_PHOTO: PhotoTone = { mean: 0.629, dark: 0.481, light: 0.905 };
const DARK_PHOTO: PhotoTone = { mean: 0.023, dark: 0.006, light: 0.062 };
const BUSY_PHOTO: PhotoTone = { mean: 0.245, dark: 0.04, light: 0.765 };
const DARK_TEXT = '#2f2b2d';

function pixels(...rgba: number[][]): Uint8ClampedArray {
    return new Uint8ClampedArray(rgba.flat());
}

describe('colorLuminance', () => {
    it('reads long and short hex colours', () => {
        expect(colorLuminance('#ffffff')).toBe(1);
        expect(colorLuminance('#000')).toBe(0);
        expect(colorLuminance(' #FFF ')).toBe(1);
    });

    it('gives up on anything else', () => {
        expect(colorLuminance('rgb(0,0,0)')).toBeUndefined();
        expect(colorLuminance('')).toBeUndefined();
    });
});

describe('contrastRatio', () => {
    it('is 21 for black on white, in either order', () => {
        expect(contrastRatio(1, 0)).toBe(21);
        expect(contrastRatio(0, 1)).toBe(21);
    });
});

describe('photoToneFromPixels', () => {
    it('finds the darkest and lightest tenth', () => {
        const data = pixels(...Array.from({ length: 10 }, (_, at) => [at * 28, at * 28, at * 28, 255]));
        const tone = photoToneFromPixels(data)!;
        expect(tone.dark).toBeCloseTo(colorLuminance('#1c1c1c')!, 5);
        expect(tone.light).toBeCloseTo(colorLuminance('#fcfcfc')!, 5);
        expect(tone.mean).toBeGreaterThan(tone.dark);
        expect(tone.mean).toBeLessThan(tone.light);
    });

    it('leaves out transparent pixels', () => {
        expect(photoToneFromPixels(pixels([255, 255, 255, 255], [0, 0, 0, 0]))).toEqual({ mean: 1, dark: 1, light: 1 });
    });

    it('has no tone without an opaque pixel', () => {
        expect(photoToneFromPixels(pixels([0, 0, 0, 0]))).toBeUndefined();
        expect(photoToneFromPixels([])).toBeUndefined();
    });
});

describe('shownPhoto', () => {
    const photos = { desktop: 'wide.jpg', mobile: 'narrow.jpg' };

    it('is the mobile photo up to the width the theme background switches at', () => {
        expect(shownPhoto(photos, 375)).toBe('narrow.jpg');
        expect(shownPhoto(photos, MOBILE_BACKGROUND_MAX_WIDTH)).toBe('narrow.jpg');
    });

    it('is the desktop photo on a wider invitation', () => {
        expect(shownPhoto(photos, MOBILE_BACKGROUND_MAX_WIDTH + 1)).toBe('wide.jpg');
        expect(shownPhoto(photos, 1280)).toBe('wide.jpg');
    });
});

describe('photoTextTint', () => {
    it('leaves dark text on a light photo alone', () => {
        expect(photoTextTint(LIGHT_PHOTO, DARK_TEXT)).toBeNull();
    });

    it('turns dark text white on a dark photo, with no tint', () => {
        expect(photoTextTint(DARK_PHOTO, DARK_TEXT)).toEqual({ color: 'dark', alpha: 0, text: 'light' });
    });

    it('darkens a busy photo under white text', () => {
        const tint = photoTextTint(BUSY_PHOTO, DARK_TEXT)!;
        expect(tint.color).toBe('dark');
        expect(tint.text).toBe('light');
        expect(tint.alpha).toBeGreaterThan(0.3);
        expect(tint.alpha).toBeLessThanOrEqual(MAX_TINT_ALPHA);
    });

    it('keeps white text white and darkens a light photo under it', () => {
        const tint = photoTextTint(LIGHT_PHOTO, '#ffffff')!;
        expect(tint).toMatchObject({ color: 'dark', text: 'keep' });
    });

    it("keeps the host's colour when a light tint is clearly enough for it", () => {
        const almostLight: PhotoTone = { mean: 0.5, dark: 0.22, light: 0.95 };
        expect(photoTextTint(almostLight, DARK_TEXT)).toMatchObject({ color: 'light', text: 'keep' });
    });

    it('never goes past the softest tint that still lets the photo show', () => {
        const white: PhotoTone = { mean: 1, dark: 1, light: 1 };
        expect(photoTextTint(white, '#ffffff')!.alpha).toBeLessThanOrEqual(MAX_TINT_ALPHA);
    });

    it('does nothing for a colour it cannot read', () => {
        expect(photoTextTint(BUSY_PHOTO, 'var(--x)')).toBeNull();
    });

    it('makes the text readable at the busy photo’s lightest spot', () => {
        const tint = photoTextTint(BUSY_PHOTO, DARK_TEXT)!;
        // White text over the lightest tenth, once the tint is under it (sRGB blend).
        const srgb = 1.055 * Math.pow(BUSY_PHOTO.light, 1 / 2.4) - 0.055;
        const tinted = srgb * (1 - tint.alpha);
        const luminance = tinted <= 0.04045 ? tinted / 12.92 : Math.pow((tinted + 0.055) / 1.055, 2.4);
        expect(contrastRatio(1, luminance)).toBeGreaterThanOrEqual(READABLE_CONTRAST);
    });
});

describe('isTextHardToReadOnPhoto', () => {
    it('does not warn on automatic contrast when a tint fixes it', () => {
        expect(isTextHardToReadOnPhoto(BUSY_PHOTO, 'auto', DARK_TEXT)).toBe(false);
    });

    it('warns when the host picked white text on a light photo', () => {
        expect(isTextHardToReadOnPhoto(LIGHT_PHOTO, 'light', DARK_TEXT)).toBe(true);
    });

    it("warns when the host kept the theme's dark colour on a busy photo", () => {
        expect(isTextHardToReadOnPhoto(BUSY_PHOTO, 'base', DARK_TEXT)).toBe(true);
    });

    it("does not warn when the host's pick reads", () => {
        expect(isTextHardToReadOnPhoto(DARK_PHOTO, 'light', DARK_TEXT)).toBe(false);
        expect(isTextHardToReadOnPhoto(LIGHT_PHOTO, 'base', DARK_TEXT)).toBe(false);
    });

    it('never warns on automatic contrast: white text on the softest dark tint always reads', () => {
        expect(WHITE_TEXT_WORST_TINT).toBeLessThanOrEqual(MAX_TINT_ALPHA);
        expect(isTextHardToReadOnPhoto({ mean: 1, dark: 1, light: 1 }, 'auto', DARK_TEXT)).toBe(false);
    });
});

describe('tintBackground', () => {
    it('is black or white at the tint strength', () => {
        expect(tintBackground({ color: 'dark', alpha: 0.4, text: 'light' })).toBe('rgba(0, 0, 0, 0.4)');
        expect(tintBackground({ color: 'light', alpha: 0.25, text: 'keep' })).toBe('rgba(255, 255, 255, 0.25)');
    });
});
