import { describe, expect, it } from 'vitest';

import type { EventModuleResponseDto, PaidServiceResponseDto } from '@/lib/api/types';
import type { FeatureAddonOffer } from '@/lib/featureAddons';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { feedModuleSection } from '@/lib/feedModuleBlocks';
import { PREMIUM_TILE_MODULES, premiumTiles, VISIBLE_TILES } from '@/lib/feedModuleTiles';
import { createSection } from '@/lib/invitation/newSection';

const on = (moduleKey: string) => ({ moduleKey, isAvailable: true, isEnabled: true }) as EventModuleResponseDto;
const offer = (grantsModuleKey: string, code = `ADD_${grantsModuleKey}`): FeatureAddonOffer => ({
    service: { code, grantsModuleKey } as PaidServiceResponseDto,
    added: false,
});
const withoutRsvp = { ...defaultFeedLayout(), sections: defaultFeedLayout().sections.filter((section) => section.type !== 'feedRsvp') };

describe('premiumTiles', () => {
    it("adds a module the event has, offers one its plan sells, hides the rest, in the owner's order", () => {
        const tiles = premiumTiles({ document: withoutRsvp, modules: [on('rsvp'), on('playlist')], offers: [offer('wishbook')], canAdd: true });
        expect(tiles).toEqual([
            { module: 'rsvp', action: 'add' },
            { module: 'wishbook', action: 'buy', addonCode: 'ADD_wishbook' },
            { module: 'playlist', action: 'add' },
        ]);
    });

    it('drops a tile whose block is already on the page', () => {
        expect(premiumTiles({ document: defaultFeedLayout(), modules: [on('rsvp')], offers: [], canAdd: true })).toEqual([]);
        const withPlaylist = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, feedModuleSection('playlist', () => 'p')] };
        expect(premiumTiles({ document: withPlaylist, modules: [on('playlist')], offers: [], canAdd: true })).toEqual([]);
    });

    it('drops the Schedule tile, to add or to buy, while the page holds a typed schedule (KAN-293)', () => {
        for (const type of ['program', 'programIcons'] as const) {
            const withTyped = { ...withoutRsvp, sections: [...withoutRsvp.sections, createSection(type, 'WEDDING')] };
            expect(premiumTiles({ document: withTyped, modules: [on('schedule')], offers: [], canAdd: true })).toEqual([]);
            expect(premiumTiles({ document: withTyped, modules: [], offers: [offer('schedule')], canAdd: true })).toEqual([]);
        }
        expect(premiumTiles({ document: withoutRsvp, modules: [], offers: [offer('schedule')], canAdd: true })).toEqual([
            { module: 'schedule', action: 'buy', addonCode: 'ADD_schedule' },
        ]);
    });

    it('offers no adding once the page is full, but still sells', () => {
        expect(premiumTiles({ document: withoutRsvp, modules: [on('playlist')], offers: [offer('quiz_polls')], canAdd: false })).toEqual([
            { module: 'quiz_polls', action: 'buy', addonCode: 'ADD_quiz_polls' },
        ]);
    });

    it('shows one row of four first', () => {
        expect(VISIBLE_TILES).toBe(4);
        expect(PREMIUM_TILE_MODULES).toEqual(['rsvp', 'wishbook', 'playlist', 'he_or_she', 'quiz_polls', 'schedule', 'wishlist', 'gallery']);
    });
});
