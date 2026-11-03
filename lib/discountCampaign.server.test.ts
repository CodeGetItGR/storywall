import { afterEach, describe, expect, it, vi } from 'vitest';

describe('fetchLiveDiscountCampaign', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    const campaign = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-08T00:00:00Z' };

    it('returns the live campaign and keeps it through an outage', async () => {
        const { fetchLiveDiscountCampaign } = await import('@/lib/discountCampaign.server');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(campaign), { status: 200 })));
        expect(await fetchLiveDiscountCampaign()).toEqual(campaign);

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })));
        expect(await fetchLiveDiscountCampaign()).toEqual(campaign);

        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')));
        expect(await fetchLiveDiscountCampaign()).toEqual(campaign);
    });

    it('clears the copy when Spring says there is none', async () => {
        const { fetchLiveDiscountCampaign } = await import('@/lib/discountCampaign.server');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(campaign), { status: 200 })));
        await fetchLiveDiscountCampaign();

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })));
        expect(await fetchLiveDiscountCampaign()).toBeNull();
    });

    it('returns null when Spring has never answered', async () => {
        const { fetchLiveDiscountCampaign } = await import('@/lib/discountCampaign.server');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')));
        expect(await fetchLiveDiscountCampaign()).toBeNull();
    });
});
