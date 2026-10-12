import { describe, expect, it } from 'vitest';

import { activeCampaign, type OccasionCampaign } from '@/lib/occasions/campaigns';

const summer: OccasionCampaign = {
    id: 'summer-weddings',
    occasions: ['WEDDING'],
    startsAt: '2027-05-01T00:00:00+03:00',
    endsAt: '2027-09-01T00:00:00+03:00',
    banner: true,
    discountCode: 'SUMMER27',
};
const everywhere: OccasionCampaign = { id: 'launch', occasions: 'all', startsAt: '2027-06-01T00:00:00Z', endsAt: '2027-06-08T00:00:00Z' };

describe('activeCampaign', () => {
    it('is active from startsAt (inclusive) to endsAt (exclusive)', () => {
        expect(activeCampaign('WEDDING', new Date('2027-04-30T20:59:59Z'), [summer])).toBeNull();
        expect(activeCampaign('WEDDING', new Date('2027-04-30T21:00:00Z'), [summer])?.id).toBe('summer-weddings');
        expect(activeCampaign('WEDDING', new Date('2027-08-31T21:00:00Z'), [summer])).toBeNull();
    });

    it('only applies to its occasions', () => {
        expect(activeCampaign('BAPTISM', new Date('2027-07-01T00:00:00Z'), [summer])).toBeNull();
        expect(activeCampaign('BAPTISM', new Date('2027-06-02T00:00:00Z'), [everywhere])?.id).toBe('launch');
    });

    it('picks the latest start when campaigns overlap', () => {
        expect(activeCampaign('WEDDING', new Date('2027-06-02T00:00:00Z'), [summer, everywhere])?.id).toBe('launch');
    });
});
