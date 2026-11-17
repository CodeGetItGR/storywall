import { describe, expect, it } from 'vitest';

import type { EventAddonDto, EventModuleResponseDto, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import {
    addonsStorageArea,
    featureAddonMode,
    featureAddonOffers,
    featureAddonsTotalMinor,
    pickedFeatureAddons,
    saveMyDateAddon,
} from '@/lib/featureAddons';

function unlock(code: string, moduleKey: string, priceAmountMinor: number, overrides: Partial<PaidServiceResponseDto> = {}): PaidServiceResponseDto {
    return {
        id: `svc-${code}`,
        code,
        kind: 'MODULE_UNLOCK',
        name: code,
        description: null,
        sortOrder: 0,
        isAssignable: true,
        isPublic: true,
        priceAmountMinor,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        grantsStorageBytes: null,
        grantsModuleKey: moduleKey,
        planTierIds: [],
        ...overrides,
    };
}

const platformModules = ['posts', 'rsvp', 'gallery', 'save_my_date'].map(
    (moduleKey, sortOrder) =>
        ({ id: moduleKey, moduleKey, name: moduleKey, description: null, isEnabled: true, sortOrder }) as PlatformModuleResponseDto,
);
const plan = { id: 'plan-lite', code: 'LITE', moduleKeys: ['posts'] } as unknown as PlanTierResponseDto;
const saveMyDate = unlock('SMD', 'save_my_date', 2900);
const rsvp = unlock('RSVP', 'rsvp', 900);
const gallery = unlock('GALLERY', 'gallery', 1500);
const paidServices = [saveMyDate, rsvp, gallery];

function eventModule(moduleKey: string, isEnabled = true): EventModuleResponseDto {
    return {
        id: moduleKey,
        eventId: 'evt',
        moduleKey,
        isEnabled,
        configuration: null,
        createdAt: '',
        isAvailable: isEnabled,
    } as EventModuleResponseDto;
}

function owned(code: string): EventAddonDto {
    return { code, name: code, priceAmountMinor: 900, billingPeriod: 'ONE_TIME', activatedAt: '2026-11-17T10:00:00Z' };
}

const base = { paidServices, platformModules, plan, eventModules: [eventModule('posts')], ownedAddons: [] as EventAddonDto[] };

describe('featureAddonMode', () => {
    it('pays on its own when live, with the plan when a draft, and not at all otherwise', () => {
        expect(featureAddonMode('ACTIVE')).toBe('checkout');
        expect(featureAddonMode('DRAFT')).toBe('draft');
        expect(featureAddonMode(null)).toBeNull();
    });
});

describe('featureAddonOffers', () => {
    it('offers every unlock the plan sells for a module it lacks', () => {
        expect(featureAddonOffers({ ...base, mode: 'checkout' }).map((offer) => offer.service.code)).toEqual(['RSVP', 'GALLERY', 'SMD']);
    });

    it('offers nothing when the event cannot change add-ons', () => {
        expect(featureAddonOffers({ ...base, mode: null })).toEqual([]);
    });

    it('leaves out an unlock sold only on other plans', () => {
        const offers = featureAddonOffers({
            ...base,
            paidServices: [unlock('RSVP', 'rsvp', 900, { planTierIds: ['plan-other'] })],
            mode: 'checkout',
        });
        expect(offers).toEqual([]);
    });

    it('leaves out a module the event already has, such as an admin grant', () => {
        const offers = featureAddonOffers({ ...base, eventModules: [eventModule('posts'), eventModule('rsvp')], mode: 'checkout' });
        expect(offers.map((offer) => offer.service.code)).toEqual(['GALLERY', 'SMD']);
    });

    it('counts a switched-off module as missing', () => {
        const offers = featureAddonOffers({ ...base, eventModules: [eventModule('rsvp', false)], mode: 'checkout' });
        expect(offers.map((offer) => offer.service.code)).toContain('RSVP');
    });

    it('hides an add-on a live event already bought', () => {
        const offers = featureAddonOffers({ ...base, eventModules: [eventModule('rsvp')], ownedAddons: [owned('RSVP')], mode: 'checkout' });
        expect(offers.map((offer) => offer.service.code)).toEqual(['GALLERY', 'SMD']);
    });

    it("keeps a draft's own add-on listed as added, so it can be removed", () => {
        const offers = featureAddonOffers({ ...base, eventModules: [eventModule('rsvp')], ownedAddons: [owned('RSVP')], mode: 'draft' });
        expect(offers).toEqual([
            { service: rsvp, added: true },
            { service: gallery, added: false },
            { service: saveMyDate, added: false },
        ]);
    });
});

describe('pickedFeatureAddons and featureAddonsTotalMinor', () => {
    it('keeps only ticked add-ons still on offer, in catalogue order, and sums their prices', () => {
        const offers = featureAddonOffers({ ...base, mode: 'checkout' });
        const picked = pickedFeatureAddons(offers, new Set(['SMD', 'RSVP', 'GONE']));
        expect(picked.map((service) => service.code)).toEqual(['RSVP', 'SMD']);
        expect(featureAddonsTotalMinor(picked)).toBe(3800);
    });

    it('never picks an add-on a draft already added', () => {
        const offers = featureAddonOffers({ ...base, eventModules: [eventModule('rsvp')], ownedAddons: [owned('RSVP')], mode: 'draft' });
        expect(pickedFeatureAddons(offers, new Set(['RSVP']))).toEqual([]);
    });
});

describe('saveMyDateAddon', () => {
    it('finds the Save my date add-on sold on the plan', () => {
        expect(saveMyDateAddon(paidServices, platformModules, plan)).toBe(saveMyDate);
    });

    it('is null when the plan includes the invitation, sells no add-on, or is unknown', () => {
        expect(saveMyDateAddon(paidServices, platformModules, { ...plan, moduleKeys: ['posts', 'save_my_date'] })).toBeNull();
        expect(saveMyDateAddon([rsvp], platformModules, plan)).toBeNull();
        expect(saveMyDateAddon(paidServices, platformModules, null)).toBeNull();
    });
});

describe('addonsStorageArea', () => {
    const live = { eventStatus: 'ACTIVE' as const, storagePackCount: 0, featuresOffered: false, featuresSettled: true };

    it('sells storage packs on a live event whose plan has them', () => {
        expect(addonsStorageArea({ ...live, storagePackCount: 2, featuresOffered: true })).toBe('purchase');
    });

    it('hides the empty storage area when features are on offer', () => {
        expect(addonsStorageArea({ ...live, featuresOffered: true })).toBeNull();
    });

    it('says nothing is available only when the plan sells neither storage nor features', () => {
        expect(addonsStorageArea(live)).toBe('empty');
    });

    it('waits for the features before saying nothing is available', () => {
        expect(addonsStorageArea({ ...live, featuresSettled: false })).toBeNull();
    });

    it('keeps the storage note on an event that is not live yet', () => {
        expect(addonsStorageArea({ ...live, eventStatus: 'DRAFT', featuresOffered: true })).toBe('inactive');
    });
});
