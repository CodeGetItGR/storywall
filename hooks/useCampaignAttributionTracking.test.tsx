import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCampaignAttributionTracking } from '@/hooks/useCampaignAttributionTracking';
import { readCampaignAttributionCookie } from '@/lib/campaignAttribution';
import { CAMPAIGN_ATTRIBUTION_COOKIE } from '@/lib/consent';
import { VISIT_SOURCE_COOKIE } from '@/lib/signupSource';

let analytics = false;
let pathname = '/';

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/hooks/useCookieConsent', () => ({ useCookieConsent: () => ({ consent: { analytics } }) }));

describe('useCampaignAttributionTracking', () => {
    afterEach(() => {
        analytics = false;
        pathname = '/';
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`;
        document.cookie = `${VISIT_SOURCE_COOKIE}=; Max-Age=0; Path=/`;
        window.history.replaceState(null, '', '/');
    });

    it('writes no cookie until analytics is allowed, and leaves the sign-up source alone', () => {
        document.cookie = `${VISIT_SOURCE_COOKIE}=kept; Path=/`;
        window.history.replaceState(null, '', '/?utm_source=instagram&utm_medium=social&utm_campaign=bf-post-el');

        const { rerender } = renderHook(() => useCampaignAttributionTracking());
        expect(readCampaignAttributionCookie()).toBeNull();

        analytics = true;
        rerender();

        expect(readCampaignAttributionCookie()).toEqual({ utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'bf-post-el' });
        expect(document.cookie).toContain(`${VISIT_SOURCE_COOKIE}=kept`);
    });

    const link = (campaign: string) => `/?utm_source=instagram&utm_medium=social&utm_campaign=${campaign}`;
    const campaignOf = (utmCampaign: string) => ({ utmSource: 'instagram', utmMedium: 'social', utmCampaign });

    it('does not rewrite the same link on a route change, so an older tab keeps a newer link from another tab', () => {
        analytics = true;
        window.history.replaceState(null, '', link('tab-a'));
        const { rerender } = renderHook(() => useCampaignAttributionTracking());
        expect(readCampaignAttributionCookie()).toEqual(campaignOf('tab-a'));

        // Another tab arrives through a newer link and saves it.
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(campaignOf('tab-b')))}; Path=/`;

        window.history.replaceState(null, '', '/pricing');
        pathname = '/pricing';
        rerender();

        expect(readCampaignAttributionCookie()).toEqual(campaignOf('tab-b'));
    });

    it('captures a new link reached by a route change, and replaces the older one', () => {
        analytics = true;
        window.history.replaceState(null, '', link('first'));
        const { rerender } = renderHook(() => useCampaignAttributionTracking());
        expect(readCampaignAttributionCookie()).toEqual(campaignOf('first'));

        window.history.replaceState(null, '', link('second'));
        pathname = '/offers';
        rerender();

        expect(readCampaignAttributionCookie()).toEqual(campaignOf('second'));
    });

    it('writes the link again when analytics is declined and accepted again', () => {
        analytics = true;
        window.history.replaceState(null, '', link('again'));
        const { rerender } = renderHook(() => useCampaignAttributionTracking());

        analytics = false;
        rerender();
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`;
        analytics = true;
        rerender();

        expect(readCampaignAttributionCookie()).toEqual(campaignOf('again'));
    });
});
