import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { defaultFeedLayout } from '@/lib/feedLayout';
import { canHaveBackground, ownSectionBackground, sectionColor, sectionPhoto, setSectionColor, setSectionPhoto } from '@/lib/feedSectionBackground';
import type { InvitationDocument } from '@/lib/invitation/document';
import { createSection } from '@/lib/invitation/newSection';
import type { InvitationSection } from '@/lib/invitation/sections';

const PAGE = { kind: 'theme', slot: 'auto' } as const;
const faq = createSection('faq', 'WEDDING', () => 'faq');
const layout: InvitationDocument = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, faq] };
const faqOf = (document: InvitationDocument) => document.sections.find((section) => section.id === 'faq')!;

describe('section backgrounds', () => {
    it('are for Save my date sections that are not locked', () => {
        expect(canHaveBackground(faq)).toBe(true);
        expect(canHaveBackground({ ...faq, locked: true })).toBe(false);
        expect(defaultFeedLayout().sections.some(canHaveBackground)).toBe(false);
    });

    it('holds one at a time, and goes back to the feed', () => {
        const coloured = produce(layout, setSectionColor('faq', '#B5BFA6'));
        expect(sectionColor(faqOf(coloured))).toBe('#B5BFA6');
        const photo = produce(coloured, setSectionPhoto('faq', 'm1'));
        expect(sectionPhoto(faqOf(photo))).toBe('m1');
        expect(sectionColor(faqOf(photo))).toBeUndefined();
        const again = produce(photo, setSectionColor('faq', '#CFB98C'));
        expect(sectionPhoto(faqOf(again))).toBeUndefined();
        expect(faqOf(produce(again, setSectionColor('faq', undefined))).style.background).toEqual(PAGE);
        expect(faqOf(produce(photo, setSectionPhoto('faq', undefined))).style.background).toEqual(PAGE);
    });

    it('leaves a section that has none alone', () => {
        const cover = layout.sections[0];
        expect(produce(layout, setSectionColor(cover.id, '#B5BFA6'))).toBe(layout);
    });

    it("knows the host's own pick from a theme's", () => {
        const withBackground = (background: InvitationSection['style']['background']) => ({ ...faq, style: { ...faq.style, background } }) as InvitationSection;
        expect(ownSectionBackground(faq, new Set())).toBeNull();
        const own = { kind: 'image', image: { source: 'media', mediaId: 'm1' } } as const;
        expect(ownSectionBackground(withBackground(own), new Set())).toEqual(own);
        expect(ownSectionBackground(withBackground(own), new Set(['m1']))).toBeNull();
        expect(ownSectionBackground(withBackground({ kind: 'image', image: { source: 'theme', assetId: 'a' } }), new Set())).toBeNull();
        expect(ownSectionBackground(withBackground({ kind: 'color' }), new Set())).toBeNull();
    });
});
