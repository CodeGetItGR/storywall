import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCampaignAttributionTracking } from '@/hooks/useCampaignAttributionTracking';
import { CAMPAIGN_ATTRIBUTION_COOKIE, readCampaignAttributionCookie } from '@/lib/campaignAttribution';
import { VISIT_SOURCE_COOKIE } from '@/lib/signupSource';

let analytics = false;

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/hooks/useCookieConsent', () => ({ useCookieConsent: () => ({ consent: { analytics } }) }));

describe('useCampaignAttributionTracking', () => {
    afterEach(() => {
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
});
