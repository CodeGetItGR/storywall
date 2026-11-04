import { afterEach, describe, expect, it } from 'vitest';

import {
    CAMPAIGN_ATTRIBUTION_COOKIE,
    checkoutAttribution,
    currentCampaignArrival,
    readCampaignAttributionCookie,
    rememberCampaignArrival,
    writeCampaignAttributionCookie,
} from '@/lib/campaignAttribution';
import { clearAnalyticsCookies } from '@/lib/consent';

const campaign = { utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'bf-post-el' };

describe('campaign attribution', () => {
    afterEach(() => {
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`;
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
        writeCampaignAttributionCookie(campaign);
        writeCampaignAttributionCookie({ ...campaign, utmCampaign: 'bf-story-el' });

        expect(checkoutAttribution()).toEqual({ attribution: { source: 'instagram', medium: 'social', campaign: 'bf-story-el' } });
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
