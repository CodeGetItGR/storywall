import { describe, expect, it } from 'vitest';

import type { CampaignLinkDto } from '@/lib/api/types';
import {
    campaignLinkFormat,
    campaignLinkLabel,
    campaignLinkLanguage,
    campaignLinkPlatform,
    campaignLinkShareUrl,
    type CampaignLinkType,
    campaignLinkType,
    type CampaignPlatform,
} from '@/lib/campaignLinks';

function link(overrides: Partial<CampaignLinkDto> = {}): CampaignLinkDto {
    return {
        id: 'l-1',
        name: 'Instagram post · EL',
        destinationPath: '/el',
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'launch-post-el',
        createdAt: '2026-11-01T09:00:00Z',
        linkGroup: null,
        destinationAnchor: 'pricing',
        shortCode: 'ig-post',
        campaignId: 'c-1',
        ...overrides,
    };
}

// What Spring's CampaignPlacement makes for the link name "launch", in Greek.
const PLACED: [string, Partial<CampaignLinkDto>, CampaignPlatform, CampaignLinkType | null][] = [
    ['INSTAGRAM_POST', { utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'launch-post-el' }, 'instagram', 'post'],
    ['INSTAGRAM_STORY', { utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'launch-story-el' }, 'instagram', 'story'],
    ['FACEBOOK_POST', { utmSource: 'facebook', utmMedium: 'social', utmCampaign: 'launch-post-el' }, 'facebook', 'post'],
    ['TIKTOK_POST', { utmSource: 'tiktok', utmMedium: 'social', utmCampaign: 'launch-post-el' }, 'tiktok', 'post'],
    ['INSTAGRAM_POST_AD', { utmSource: 'instagram', utmMedium: 'paid_social', utmCampaign: 'launch-post-el' }, 'instagram', 'postAd'],
    ['INSTAGRAM_STORY_AD', { utmSource: 'instagram', utmMedium: 'paid_social', utmCampaign: 'launch-story-el' }, 'instagram', 'storyAd'],
    ['FACEBOOK_POST_AD', { utmSource: 'facebook', utmMedium: 'paid_social', utmCampaign: 'launch-post-el' }, 'facebook', 'postAd'],
    ['TIKTOK_POST_AD', { utmSource: 'tiktok', utmMedium: 'paid_social', utmCampaign: 'launch-post-el' }, 'tiktok', 'postAd'],
    ['GOOGLE_ADS', { utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'launch-search-el' }, 'google', 'searchAd'],
    ['PINTEREST', { utmSource: 'pinterest', utmMedium: 'social', utmCampaign: 'launch-post-el' }, 'pinterest', 'post'],
    ['YOUTUBE', { utmSource: 'youtube', utmMedium: 'social', utmCampaign: 'launch-post-el' }, 'youtube', 'post'],
    ['LINKEDIN', { utmSource: 'linkedin', utmMedium: 'social', utmCampaign: 'launch-post-el' }, 'linkedin', 'post'],
    ['EMAIL', { utmSource: 'newsletter', utmMedium: 'email', utmCampaign: 'launch-email-el' }, 'email', null],
    ['PARTNER', { utmSource: 'acme', utmMedium: 'partner', utmCampaign: 'launch-partner-el' }, 'partner', null],
    ['PRINTED_QR', { utmSource: 'print', utmMedium: 'qr', utmCampaign: 'launch-qr-el' }, 'qr', null],
    ['OTHER', { utmSource: 'radio', utmMedium: 'audio', utmCampaign: 'launch-link-el' }, 'other', null],
];

describe('campaignLinkPlatform and campaignLinkType', () => {
    it.each(PLACED)('read a %s link', (_, values, platform, type) => {
        expect(campaignLinkPlatform(link(values))).toBe(platform);
        expect(campaignLinkType(link(values))).toBe(type);
    });

    it('read values typed by hand in capitals', () => {
        const typed = link({ utmSource: 'Instagram', utmMedium: 'Paid_Social', utmCampaign: 'october' });
        expect(campaignLinkPlatform(typed)).toBe('instagram');
        expect(campaignLinkType(typed)).toBe('postAd');
    });

    it('read an old link with no format as a post, and an unpaid Google link as no type', () => {
        expect(campaignLinkFormat(link({ utmCampaign: 'october-bio' }))).toBeNull();
        expect(campaignLinkType(link({ utmCampaign: 'october-bio' }))).toBe('post');
        expect(campaignLinkType(link({ utmSource: 'google', utmMedium: 'organic', utmCampaign: 'october' }))).toBeNull();
    });
});

describe('campaignLinkLanguage', () => {
    it('reads the language from the campaign value', () => {
        expect(campaignLinkLanguage(link({ utmCampaign: 'launch-post-en', destinationPath: '/' }))).toBe('en');
        expect(campaignLinkLanguage(link({ utmCampaign: 'launch-weddings-post-el', destinationPath: '/el/gamos' }))).toBe('el');
    });

    it('reads an old link from its page', () => {
        expect(campaignLinkLanguage(link({ utmCampaign: 'october', destinationPath: '/el' }))).toBe('el');
        expect(campaignLinkLanguage(link({ utmCampaign: 'october', destinationPath: '/el/gamos' }))).toBe('el');
        expect(campaignLinkLanguage(link({ utmCampaign: 'october', destinationPath: '/weddings' }))).toBe('en');
    });
});

describe('campaignLinkLabel', () => {
    const greek = link();
    const english = link({ id: 'l-2', utmCampaign: 'launch-post-en', destinationPath: '/' });

    it('shows the platform and type only, when the campaign has one language and the link leads home', () => {
        expect(campaignLinkLabel(greek, [greek])).toEqual({ platform: 'instagram', type: 'post', text: null, language: null, page: null });
    });

    it('shows the language when the campaign has both', () => {
        expect(campaignLinkLabel(greek, [greek, english]).language).toBe('el');
    });

    it("shows a page that isn't home, and a partner's or source's name", () => {
        expect(campaignLinkLabel(link({ destinationPath: '/el/gamos', destinationAnchor: null }), [greek]).page).toBe('/el/gamos');
        expect(campaignLinkLabel(link({ utmSource: 'acme', utmMedium: 'partner', utmCampaign: 'launch-partner-el' }), [greek]).text).toBe('acme');
        expect(campaignLinkLabel(link({ utmSource: 'radio', utmMedium: 'audio', utmCampaign: 'launch-link-el' }), [greek]).text).toBe('radio');
    });

    it('never shows the stored name, which repeats the campaign', () => {
        expect(Object.values(campaignLinkLabel(greek, [greek, english]))).not.toContain(greek.name);
    });
});

describe('campaignLinkShareUrl', () => {
    it('gives a Google search ad the full address, as Google asks for the final page', () => {
        expect(campaignLinkShareUrl(link({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'launch-search-el' }))).toBe(
            'https://www.storywall.gr/el?utm_source=google&utm_medium=cpc&utm_campaign=launch-search-el#pricing',
        );
    });

    it('gives anything else the short address', () => {
        expect(campaignLinkShareUrl(link({ shortCode: 'ig-story' }))).toBe('https://www.storywall.gr/c/ig-story');
    });
});
