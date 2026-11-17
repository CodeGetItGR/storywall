import { describe, expect, it } from 'vitest';

import { guestOfferCreateHref, guestOfferView } from './guestOffer';

const campaign = { id: 'c1', percent: 30, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-08T00:00:00Z' };

describe('guestOfferView', () => {
    it('offers the claim with its percent without a campaign', () => {
        expect(guestOfferView({ discountPercent: 20, code: null, endsAt: null }, null)).toEqual({
            mode: 'claim',
            percent: 20,
            campaignEndsAt: null,
        });
    });

    it('shows the campaign percent and end while a campaign is live', () => {
        expect(guestOfferView({ discountPercent: 20, code: null, endsAt: null }, campaign)).toEqual({
            mode: 'campaign',
            percent: 30,
            campaignEndsAt: campaign.endsAt,
        });
    });

    it('keeps a claimed code over a live campaign and shows no percent', () => {
        expect(guestOfferView({ discountPercent: 20, code: 'GS-1', endsAt: null }, campaign)).toEqual({
            mode: 'claimed',
            percent: null,
            campaignEndsAt: null,
        });
    });
});

describe('guestOfferCreateHref', () => {
    it('opens event creation with the guest code filled in', () => {
        expect(guestOfferCreateHref('GS-7KQ4')).toBe('/events/new?code=GS-7KQ4');
    });

    it('opens event creation without a code when the guest holds none', () => {
        expect(guestOfferCreateHref(null)).toBe('/events/new');
    });
});
