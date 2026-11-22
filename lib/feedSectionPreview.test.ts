import { describe, expect, it } from 'vitest';

import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { buildFeedSectionPreviews, feedPreviewNeedsPlaceholder, feedSectionPreview } from '@/lib/feedSectionPreview';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

describe('feedSectionPreview', () => {
    it("uses the theme's own sample of that type", () => {
        const sample = { ...(SAMPLE_SECTIONS.faq as InvitationSection), id: 'theme-faq' };
        const preview = feedSectionPreview('faq', new Map([[sample.id, sample]]), 'WEDDING');
        expect(preview.type).toBe('faq');
        expect(preview.data).toEqual(sample.data);
        expect(preview.id).toBe('preview-faq');
        expect(preview.visible).toBe(true);
    });

    it('falls back to a new section', () => {
        expect(feedSectionPreview('dressCode', null, 'WEDDING').type).toBe('dressCode');
    });

    it('strips the effect and the transition', () => {
        const sample = {
            ...(SAMPLE_SECTIONS.faq as InvitationSection),
            style: { ...SAMPLE_SECTIONS.faq.style, effect: { type: 'snow' }, transition: { assetId: 'a-1', edge: 'bottom' } },
        } as unknown as InvitationSection;
        const preview = feedSectionPreview('faq', new Map([[sample.id, sample]]), 'WEDDING');
        expect(preview.style.effect).toBeUndefined();
        expect(preview.style.transition).toBeUndefined();
    });
});

describe('feedSectionPreview photo frames', () => {
    it("stills a photo frame's looping animation", () => {
        const sample = SAMPLE_SECTIONS.photoFrame as InvitationSection;
        const looping = {
            ...sample,
            elements: (sample as Extract<InvitationSection, { type: 'photoFrame' }>).elements.map((element) =>
                element.kind === 'photoFrame' ? { ...element, animation: 'float' } : element,
            ),
        } as InvitationSection;
        const preview = feedSectionPreview('photoFrame', new Map([[looping.id, looping]]), 'WEDDING');
        if (preview.type !== 'photoFrame') throw new Error('expected a photo frame section');
        const frames = preview.elements.filter((element) => element.kind === 'photoFrame');
        expect(frames.length).toBeGreaterThan(0);
        for (const frame of frames) expect(frame.animation).toBe('none');
    });
});

const ctx = buildRenderContext(defaultFeedLayout(), wallThemeDesign(null), () => undefined);

describe('feedPreviewNeedsPlaceholder', () => {
    it('is true for a gallery with no photos', () => {
        expect(feedPreviewNeedsPlaceholder(feedSectionPreview('gallery', null, 'WEDDING'), ctx)).toBe(true);
    });

    it('is false for a gallery whose photos load', () => {
        const withPhotos = buildRenderContext(defaultFeedLayout(), wallThemeDesign(null), () => 'https://example.test/p.jpg');
        expect(feedPreviewNeedsPlaceholder(SAMPLE_SECTIONS.gallery as InvitationSection, withPhotos)).toBe(false);
    });

    it('is false for any other section', () => {
        expect(feedPreviewNeedsPlaceholder(feedSectionPreview('faq', null, 'WEDDING'), ctx)).toBe(false);
    });
});

describe('buildFeedSectionPreviews', () => {
    const base = { document: defaultFeedLayout(), theme: wallThemeDesign(null), media: () => undefined, eventType: 'WEDDING', locale: 'en' };
    const theos: InvitationFontDto = { key: 'theos', familyName: 'Theos', fallback: 'serif', url: '/api/theme-fonts/theos/1.woff2' };

    it('marks the empty gallery for a placeholder and draws without text animation', () => {
        const previews = buildFeedSectionPreviews({ ...base, types: ['gallery', 'faq'], samples: null, fonts: [] });
        expect(previews.items.map((item) => [item.type, item.placeholder])).toEqual([
            ['gallery', true],
            ['faq', false],
        ]);
        expect(previews.ctx.theme.textAnimation).toBe('none');
    });

    it('declares uploaded fonts that only the samples name', () => {
        const sample = {
            ...(SAMPLE_SECTIONS.faq as InvitationSection),
            style: { ...SAMPLE_SECTIONS.faq.style, font: "'Theos', serif" },
        } as unknown as InvitationSection;
        const samples = { sections: new Map([[sample.id, sample]]), imageUrls: {} };
        expect(buildFeedSectionPreviews({ ...base, types: ['faq'], samples, fonts: [theos] }).fontFaces).toContain('font-family:"Theos"');
        expect(buildFeedSectionPreviews({ ...base, types: ['faq'], samples: null, fonts: [theos] }).fontFaces).toBe('');
    });
});
