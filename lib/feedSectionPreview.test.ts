import { describe, expect, it } from 'vitest';

import { feedSectionPreview } from '@/lib/feedSectionPreview';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

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
