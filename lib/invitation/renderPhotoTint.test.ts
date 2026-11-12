import { describe, expect, it } from 'vitest';

import { buildRenderContext, sectionBackgroundPhotos, sectionPhotoTint } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const media = (id: string) => (id === 'gone' ? undefined : `https://cdn.test/${id}`);
const ctx = buildRenderContext(SAMPLE_DOCUMENT, SAMPLE_THEME, media);
const blank = SAMPLE_SECTIONS.blank;

function withStyle<T extends InvitationSection>(section: T, style: Partial<T['style']>): T {
    return { ...section, style: { ...section.style, ...style } };
}

const onPhoto = withStyle(blank, { background: { kind: 'image', image: { source: 'media', mediaId: 'm-host' } } });

describe('sectionBackgroundPhotos', () => {
    it("is the theme background's desktop and mobile photo", () => {
        expect(sectionBackgroundPhotos(SAMPLE_SECTIONS.top, 0, ctx)).toEqual({ desktop: 'https://cdn.test/m-top', mobile: 'https://cdn.test/m-top-mobile' });
    });

    it("is the host's own photo", () => {
        expect(sectionBackgroundPhotos(onPhoto, 0, ctx)).toEqual({ desktop: 'https://cdn.test/m-host', mobile: 'https://cdn.test/m-host' });
    });

    it("falls back to the theme background when the host's photo is gone", () => {
        const gone = withStyle(blank, { background: { kind: 'image', image: { source: 'media', mediaId: 'gone' } } });
        expect(sectionBackgroundPhotos(gone, 0, ctx)).toEqual(sectionBackgroundPhotos(blank, 0, ctx));
    });

    it('is none on a solid colour or a theme without photos', () => {
        expect(sectionBackgroundPhotos(withStyle(blank, { background: { kind: 'color', color: '#123456' } }), 0, ctx)).toBeUndefined();
        const plain = buildRenderContext(SAMPLE_DOCUMENT, {
            ...SAMPLE_THEME,
            backgrounds: { top: { mode: 'cover', stableRepeat: false }, content: { mode: 'cover', stableRepeat: false }, extra: { mode: 'cover', stableRepeat: false } },
        }, media);
        expect(sectionBackgroundPhotos(blank, 0, plain)).toBeUndefined();
    });

    it('uses the desktop photo on phones when the theme has no mobile one', () => {
        const desktopOnly = buildRenderContext(SAMPLE_DOCUMENT, {
            ...SAMPLE_THEME,
            backgrounds: { ...SAMPLE_THEME.backgrounds, top: { desktop: { mediaId: 'm-wide' }, mode: 'cover', stableRepeat: false } },
        }, media);
        expect(sectionBackgroundPhotos(SAMPLE_SECTIONS.top, 0, desktopOnly)).toEqual({ desktop: 'https://cdn.test/m-wide', mobile: 'https://cdn.test/m-wide' });
    });
});

describe('sectionPhotoTint', () => {
    it("gives the photos and the invitation's text colour on automatic contrast", () => {
        expect(sectionPhotoTint(onPhoto, 0, ctx)).toEqual({ photos: { desktop: 'https://cdn.test/m-host', mobile: 'https://cdn.test/m-host' }, textColor: ctx.textColor });
    });

    it('steps aside when the host picked the text contrast', () => {
        expect(sectionPhotoTint(withStyle(onPhoto, { textContrast: 'light' }), 0, ctx)).toBeUndefined();
        expect(sectionPhotoTint(withStyle(onPhoto, { textContrast: 'base' }), 0, ctx)).toBeUndefined();
    });

    it('is not needed without a photo behind the text', () => {
        expect(sectionPhotoTint(withStyle(blank, { background: { kind: 'color', color: '#ffffff' } }), 0, ctx)).toBeUndefined();
    });

    it("leaves a photo section's own photo alone", () => {
        expect(sectionPhotoTint(SAMPLE_SECTIONS.photo, 0, ctx)).toBeUndefined();
    });
});
