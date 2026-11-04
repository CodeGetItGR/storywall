import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    checkoutAttribution,
    currentCampaignArrival,
    readCampaignAttributionCookie,
    rememberCampaignArrival,
    writeCampaignAttributionCookie,
} from '@/lib/campaignAttribution';
import { CAMPAIGN_ATTRIBUTION_COOKIE, CONSENT_COOKIE, clearAnalyticsCookies, writeConsent } from '@/lib/consent';
import { guestOfferLandingHref } from '@/lib/guestOffer';

const campaign = { utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'bf-post-el' };

describe('campaign attribution', () => {
    afterEach(() => {
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`;
        document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`;
    });

    it('remembers the latest link, and a plain page keeps it', () => {
        rememberCampaignArrival('https://www.storywall.gr/?utm_source=instagram&utm_medium=social&utm_campaign=first');
        rememberCampaignArrival('https://www.storywall.gr/pricing');
        expect(currentCampaignArrival()?.utmCampaign).toBe('first');

        rememberCampaignArrival('https://www.storywall.gr/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=second');
        expect(currentCampaignArrival()).toEqual({ utmSource: 'tiktok', utmMedium: 'paid_social', utmCampaign: 'second' });
    });

    it('sends nothing at checkout without a cookie', () => {
        expect(checkoutAttribution()).toEqual({});
    });

    it('sends the last link written', () => {
        writeConsent({ ads: false, analytics: true });
        writeCampaignAttributionCookie(campaign);
        writeCampaignAttributionCookie({ ...campaign, utmCampaign: 'bf-story-el' });

        expect(checkoutAttribution()).toEqual({ attribution: { source: 'instagram', medium: 'social', campaign: 'bf-story-el' } });
    });

    it('sends nothing when there is a cookie but no consent', () => {
        writeCampaignAttributionCookie(campaign);

        expect(checkoutAttribution()).toEqual({});
    });

    it('sends nothing when analytics is declined', () => {
        writeConsent({ ads: true, analytics: false });
        writeCampaignAttributionCookie(campaign);

        expect(checkoutAttribution()).toEqual({});
    });

    it('does not let the guest offer link replace a remembered campaign link', () => {
        rememberCampaignArrival('https://www.storywall.gr/?utm_source=instagram&utm_medium=social&utm_campaign=bf-post-el');
        rememberCampaignArrival(`https://www.storywall.gr${guestOfferLandingHref('el')}`);

        expect(currentCampaignArrival()).toEqual(campaign);
    });

    it('remembers nothing from the guest offer link alone', async () => {
        vi.resetModules();
        const fresh = await import('@/lib/campaignAttribution');
        const guestOffer = await import('@/lib/guestOffer');

        fresh.rememberCampaignArrival(`https://www.storywall.gr${guestOffer.guestOfferLandingHref('en')}`);

        expect(fresh.currentCampaignArrival()).toBeNull();
    });

    it('still remembers another storywall link', async () => {
        vi.resetModules();
        const fresh = await import('@/lib/campaignAttribution');

        fresh.rememberCampaignArrival('https://www.storywall.gr/?utm_source=storywall&utm_medium=feed&utm_campaign=other');

        expect(fresh.currentCampaignArrival()?.utmCampaign).toBe('other');
    });

    it('ignores a cookie it cannot read', () => {
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=not-json; Path=/`;
        expect(readCampaignAttributionCookie()).toBeNull();

        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=${encodeURIComponent('{"utmSource":1}')}; Path=/`;
        expect(readCampaignAttributionCookie()).toBeNull();
    });

    it('is cleared when analytics consent goes', () => {
        writeCampaignAttributionCookie(campaign);

        clearAnalyticsCookies();

        expect(readCampaignAttributionCookie()).toBeNull();
    });
});
