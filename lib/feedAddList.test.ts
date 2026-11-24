import { describe, expect, it } from 'vitest';

import type { EventModuleResponseDto } from '@/lib/api/types';
import { feedAddList } from '@/lib/feedAddList';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { MAX_SECTIONS } from '@/lib/invitation/document';
import { createSection } from '@/lib/invitation/newSection';

const layout = defaultFeedLayout();
const on = (moduleKey: string) => ({ moduleKey, isAvailable: true }) as EventModuleResponseDto;

describe('feedAddList', () => {
    it("lists a wedding's sections in the owner's order", () => {
        expect(feedAddList(layout, 'WEDDING', [])).toEqual([
            'invitation',
            'coupleProfiles',
            'parents',
            'weddingSponsors',
            'gallery',
            'ourStoryProposal',
            'program',
            'dressCode',
            'faq',
            'accommodation',
            'gift',
            'contact',
        ]);
    });

    it("lists a baptism's", () => {
        expect(feedAddList(layout, 'BAPTISM', [])).toEqual([
            'invitation',
            'baby',
            'parentsPhoto',
            'godparents',
            'gallery',
            'program',
            'faq',
            'accommodation',
            'gift',
            'contact',
        ]);
    });

    it('lists the same for a baby shower and a gender reveal', () => {
        const expected = ['invitation', 'gallery', 'program', 'faq', 'accommodation', 'gift', 'contact'];
        expect(feedAddList(layout, 'BABY_SHOWER', [])).toEqual(expected);
        expect(feedAddList(layout, 'GENDER_REVEAL', [])).toEqual(expected);
    });

    it('lists the short list for a birthday and any other type', () => {
        const expected = ['invitation', 'gallery', 'program', 'faq', 'accommodation', 'contact'];
        expect(feedAddList(layout, 'BIRTHDAY', [])).toEqual(expected);
        expect(feedAddList(layout, 'REUNION', [])).toEqual(expected);
        expect(feedAddList(layout, 'SOMETHING_NEW', [])).toEqual(expected);
    });

    it('drops a section already on the page', () => {
        const withFaq = { ...layout, sections: [...layout.sections, createSection('faq', 'WEDDING')] };
        expect(feedAddList(withFaq, 'WEDDING', [])).not.toContain('faq');
    });

    it("drops the schedule and the gift when their module's tile covers them", () => {
        const list = feedAddList(layout, 'WEDDING', [on('schedule'), on('wishlist')]);
        expect(list).not.toContain('program');
        expect(list).not.toContain('gift');
    });

    it('offers nothing once the page is full', () => {
        const full = { ...layout, sections: Array.from({ length: MAX_SECTIONS }, () => createSection('blank', 'WEDDING')) };
        expect(feedAddList(full, 'WEDDING', [])).toEqual([]);
    });
});
