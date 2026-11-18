import { describe, expect, it } from 'vitest';

import { campaignRedirectUrl, campaignShortUrl, campaignUrl, isUtmValue, pageRows, toUtmValue, UNKNOWN_PAGE } from '@/lib/campaignLinks';
import { captureVisitSource } from '@/lib/signupSource';

describe('toUtmValue', () => {
    it('lowercases, turns spaces into dashes and drops what Spring refuses', () => {
        expect(toUtmValue('October Bio!')).toBe('october-bio');
        expect(toUtmValue('Γάμος 2026')).toBe('-2026');
        expect(toUtmValue('a'.repeat(120))).toHaveLength(100);
    });
});

describe('isUtmValue', () => {
    it('needs a letter or digit first', () => {
        expect(isUtmValue('paid_social')).toBe(true);
        expect(isUtmValue('-2026')).toBe(false);
        expect(isUtmValue('')).toBe(false);
    });
});

describe('campaignUrl', () => {
    it('adds the UTM values to the page and leaves empty ones out', () => {
        expect(
            campaignUrl(
                { destinationPath: '/el', utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'october-bio' },
                'https://www.storywall.gr',
            ),
        ).toBe('https://www.storywall.gr/el?utm_source=instagram&utm_medium=social&utm_campaign=october-bio');
        expect(campaignUrl({ destinationPath: '/', utmSource: 'x', utmMedium: '', utmCampaign: '' }, 'https://www.storywall.gr')).toBe(
            'https://www.storywall.gr/?utm_source=x',
        );
    });

    it('is read back by the sign-up source capture', () => {
        const url = campaignUrl(
            { destinationPath: '/el', utmSource: 'facebook', utmMedium: 'paid_social', utmCampaign: 'launch' },
            'https://www.storywall.gr',
        );
        expect(captureVisitSource(url, '', {})).toMatchObject({ utmSource: 'facebook', utmMedium: 'paid_social', utmCampaign: 'launch' });
    });
});

describe('campaignShortUrl', () => {
    it('is the readable code on the site', () => {
        expect(campaignShortUrl({ shortCode: 'instagram-paid-sale' }, 'https://www.storywall.gr')).toBe(
            'https://www.storywall.gr/c/instagram-paid-sale',
        );
    });
});

describe('campaignRedirectUrl', () => {
    const target = { destinationPath: '/el', destinationAnchor: 'pricing', utmSource: 'facebook', utmMedium: 'paid_social', utmCampaign: 'launch' };

    it('is read back by the sign-up source capture, with the ad click id', () => {
        const url = campaignRedirectUrl(target, new URLSearchParams('gclid=abc'), 'https://www.storywall.gr');
        expect(captureVisitSource(url, '', {})).toMatchObject({ utmSource: 'facebook', utmMedium: 'paid_social', utmCampaign: 'launch' });
        expect(new URL(url).searchParams.get('gclid')).toBe('abc');
        expect(new URL(url).hash).toBe('#pricing');
    });
});

describe('campaignUrl with an anchor', () => {
    const parts = { destinationPath: '/el', utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'bf-post-el' };

    it('puts the anchor after the query', () => {
        expect(campaignUrl({ ...parts, destinationAnchor: 'pricing' }, 'https://www.storywall.gr')).toBe(
            'https://www.storywall.gr/el?utm_source=instagram&utm_medium=social&utm_campaign=bf-post-el#pricing',
        );
    });

    it('leaves a link with no anchor as it was', () => {
        expect(campaignUrl({ ...parts, destinationAnchor: null }, 'https://www.storywall.gr')).not.toContain('#');
    });
});

describe('pageRows', () => {
    it('keys a visit whose page is unknown apart, biggest first', () => {
        const rows = pageRows([
            { page: '/', visits: 30 },
            { page: null, visits: 4 },
            { page: '/el', visits: 112 },
        ]);

        expect(rows.map((row) => row.key)).toEqual(['/el', '/', UNKNOWN_PAGE]);
    });
});
