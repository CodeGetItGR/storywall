import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    campaignFromUrl,
    currentCampaign,
    pageLanguage,
    rememberCampaign,
    sendCampaignClick,
    sendCampaignVisit,
} from '@/lib/campaignVisits';

const CAMPAIGN = { utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'spring' };

const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 204 })));

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockClear();
    rememberCampaign(null);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function sentBody(call = 0) {
    const init = fetchMock.mock.calls[call][1] as RequestInit;
    return JSON.parse(String(init.body));
}

describe('campaignFromUrl', () => {
    it('needs all three utm values', () => {
        expect(campaignFromUrl('https://storywall.gr/el?utm_source=instagram&utm_medium=social&utm_campaign=spring')).toEqual(CAMPAIGN);
        expect(campaignFromUrl('https://storywall.gr/?utm_source=instagram&utm_medium=social')).toBeNull();
        expect(campaignFromUrl('https://storywall.gr/')).toBeNull();
    });

    it('trims and caps each value', () => {
        const long = 'x'.repeat(120);
        expect(campaignFromUrl(`https://storywall.gr/?utm_source=%20instagram%20&utm_medium=social&utm_campaign=${long}`)).toEqual({
            utmSource: 'instagram',
            utmMedium: 'social',
            utmCampaign: 'x'.repeat(100),
        });
        expect(campaignFromUrl('https://storywall.gr/?utm_source=%20&utm_medium=social&utm_campaign=spring')).toBeNull();
    });
});

describe('pageLanguage', () => {
    it('is the locale segment, or English', () => {
        expect(pageLanguage('/el')).toBe('el');
        expect(pageLanguage('/el/gamos')).toBe('el');
        expect(pageLanguage('/')).toBe('en');
        expect(pageLanguage('/weddings')).toBe('en');
    });
});

describe('sending', () => {
    it('posts a visit straight to Spring without credentials', () => {
        sendCampaignVisit('VISIT', CAMPAIGN, 'el');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toMatch(/\/api\/public\/campaign-visits$/);
        expect(init).toMatchObject({ method: 'POST', keepalive: true, credentials: 'omit' });
        expect(sentBody()).toEqual({ kind: 'VISIT', ...CAMPAIGN, language: 'el' });
    });

    it('swallows a failed request', async () => {
        fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('offline')));
        expect(() => sendCampaignVisit('VISIT', CAMPAIGN, 'en')).not.toThrow();
        await Promise.resolve();
    });

    it('sends a click only for a visit that came from a campaign', () => {
        window.history.replaceState(null, '', '/el');
        sendCampaignClick('CREATE');
        expect(fetchMock).not.toHaveBeenCalled();

        rememberCampaign(CAMPAIGN);
        expect(currentCampaign()).toEqual(CAMPAIGN);
        sendCampaignClick('CREATE');
        expect(sentBody()).toEqual({ kind: 'CREATE', ...CAMPAIGN, language: 'el' });
    });
});
