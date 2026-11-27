import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { EventModuleResponseDto } from '@/lib/api/types';
import { FEED_ADD_TYPES, feedAddList } from '@/lib/feedAddList';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { MAX_SECTIONS } from '@/lib/invitation/document';
import { createSection } from '@/lib/invitation/newSection';

const layout = defaultFeedLayout();
const on = (moduleKey: string) => ({ moduleKey, isAvailable: true }) as EventModuleResponseDto;

describe('feedAddList', () => {
    it("lists a wedding's sections in the owner's order (KAN-293)", () => {
        expect(feedAddList(layout, 'WEDDING', [])).toEqual([
            'invitation',
            'coupleNames',
            'coupleProfiles',
            'coupleProfilesSimple',
            'parentsSimple',
            'weddingSponsors',
            'weddingSponsorsSimple',
            'date',
            'countdown',
            'locations',
            'gallery',
            'ourStoryProposal',
            'dressCode',
            'faq',
            'accommodation',
            'gift',
            'coupleContact',
            'contact',
            'photo',
            'blank',
        ]);
    });

    it("lists a baptism's", () => {
        expect(feedAddList(layout, 'BAPTISM', [])).toEqual([
            'invitation',
            'baby',
            'parentsPhoto',
            'parentsSimple',
            'godparents',
            'date',
            'countdown',
            'locations',
            'gallery',
            'faq',
            'accommodation',
            'gift',
            'contact',
            'photo',
            'blank',
        ]);
    });

    it('lists the same for a baby shower and a gender reveal, with the gift', () => {
        const expected = ['invitation', 'date', 'countdown', 'locations', 'gallery', 'faq', 'accommodation', 'gift', 'contact', 'photo', 'blank'];
        expect(feedAddList(layout, 'BABY_SHOWER', [])).toEqual(expected);
        expect(feedAddList(layout, 'GENDER_REVEAL', [])).toEqual(expected);
    });

    it("lists the birthday's for a social event, a private party, a reunion and any other type: no gift", () => {
        const expected = ['invitation', 'date', 'countdown', 'locations', 'gallery', 'faq', 'accommodation', 'contact', 'photo', 'blank'];
        for (const type of ['BIRTHDAY', 'SOCIAL_EVENT', 'PRIVATE_PARTY', 'REUNION', 'SOMETHING_NEW']) {
            expect(feedAddList(layout, type, [])).toEqual(expected);
        }
    });

    it('never offers Families, a typed schedule or the schedule with icons', () => {
        for (const type of ['WEDDING', 'BAPTISM', 'BIRTHDAY', 'BABY_SHOWER']) {
            const list = feedAddList(layout, type, []);
            expect(list).not.toContain('parents');
            expect(list).not.toContain('program');
            expect(list).not.toContain('programIcons');
        }
    });

    it('offers the photo and the free section again while one is on the page', () => {
        const withBoth = { ...layout, sections: [...layout.sections, createSection('photo', 'WEDDING'), createSection('blank', 'WEDDING')] };
        expect(feedAddList(withBoth, 'WEDDING', [])).toEqual(expect.arrayContaining(['photo', 'blank']));
    });

    it('drops a section already on the page', () => {
        const withFaq = { ...layout, sections: [...layout.sections, createSection('faq', 'WEDDING')] };
        expect(feedAddList(withFaq, 'WEDDING', [])).not.toContain('faq');
    });

    it("drops the gift when the Gift account module's tile covers it", () => {
        expect(feedAddList(layout, 'WEDDING', [on('wishlist')])).not.toContain('gift');
        expect(feedAddList(layout, 'WEDDING', [on('schedule')])).toContain('gift');
    });

    it('offers nothing once the page is full', () => {
        const full = { ...layout, sections: Array.from({ length: MAX_SECTIONS }, () => createSection('blank', 'WEDDING')) };
        expect(feedAddList(full, 'WEDDING', [])).toEqual([]);
    });
});

describe('the Add list icons', () => {
    it('has an icon for every type it offers', () => {
        const missing = FEED_ADD_TYPES.filter((type) => !existsSync(join(process.cwd(), 'public/icons/sections', `${type}.svg`)));
        expect(missing).toEqual([]);
    });
});
