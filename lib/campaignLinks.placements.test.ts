import { describe, expect, it } from 'vitest';

import { linkFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import type { CampaignPlacement } from '@/lib/api/types';
import {
    CAMPAIGN_PLACEMENTS,
    campaignLinkFormat,
    campaignLinkPlatform,
    campaignLinksRequest,
    campaignLinkType,
    type CampaignPageOption,
    campaignPageOptions,
    campaignPlacementCampaign,
    isPlacementAdded,
} from '@/lib/campaignLinks';

const HOME: CampaignPageOption = { key: null, kind: 'home', paths: { en: '/', el: '/el' } };
const WEDDINGS: CampaignPageOption = { key: 'weddings', kind: 'occasion', paths: { en: '/weddings', el: '/el/gamos' } };

function option(placement: CampaignPlacement) {
    const found = CAMPAIGN_PLACEMENTS.find((entry) => entry.placement === placement);
    if (!found) throw new Error(`No ${placement}`);
    return found;
}

describe('CAMPAIGN_PLACEMENTS', () => {
    it('offers every placement once', () => {
        expect(new Set(CAMPAIGN_PLACEMENTS.map((entry) => entry.placement)).size).toBe(16);
    });

    it('reads back as the platform, type and format it was made for', () => {
        for (const entry of CAMPAIGN_PLACEMENTS) {
            if (entry.source === null || entry.medium === null) continue;
            const made = linkFixture({
                utmSource: entry.source,
                utmMedium: entry.medium,
                utmCampaign: campaignPlacementCampaign('launch', null, entry.format, 'el'),
            });

            expect([campaignLinkPlatform(made), campaignLinkType(made), campaignLinkFormat(made)]).toEqual([
                entry.platform,
                entry.type,
                entry.format,
            ]);
        }
    });
});

describe('campaignPlacementCampaign', () => {
    it('builds utm_campaign as Spring does', () => {
        expect(campaignPlacementCampaign('launch', null, 'story', 'el')).toBe('launch-story-el');
        expect(campaignPlacementCampaign('launch', 'weddings', 'post', 'en')).toBe('launch-weddings-post-en');
    });
});

describe('isPlacementAdded', () => {
    const links = [linkFixture({ utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'launch-story-el' })];

    it('counts a placement as added only when every chosen language has it on that page', () => {
        expect(isPlacementAdded(option('INSTAGRAM_STORY'), ['el'], null, 'launch', links)).toBe(true);
        expect(isPlacementAdded(option('INSTAGRAM_STORY'), ['el', 'en'], null, 'launch', links)).toBe(false);
        expect(isPlacementAdded(option('INSTAGRAM_STORY_AD'), ['el'], null, 'launch', links)).toBe(false);
        expect(isPlacementAdded(option('INSTAGRAM_STORY'), ['el'], 'weddings', 'launch', links)).toBe(false);
    });

    it('never counts Partner or Other as added, as they depend on what is typed', () => {
        const partner = [linkFixture({ utmSource: 'acme', utmMedium: 'partner', utmCampaign: 'launch-partner-el' })];

        expect(isPlacementAdded(option('PARTNER'), ['el'], null, 'launch', partner)).toBe(false);
    });
});

describe('campaignPageOptions', () => {
    it('starts with home, and has each ready occasion with its path per language', () => {
        const pages = campaignPageOptions();

        expect(pages[0]).toEqual(HOME);
        expect(pages).toContainEqual(WEDDINGS);
    });
});

describe('campaignLinksRequest', () => {
    it('sends the ticked placements in the picker order, and typed values only with their placement', () => {
        const request = campaignLinksRequest({
            placements: new Set<CampaignPlacement>(['EMAIL', 'INSTAGRAM_POST']),
            languages: ['el'],
            page: HOME,
            partnerName: 'acme',
            utmSource: 'flyer',
            utmMedium: 'print',
        });

        expect(request).toEqual({
            placements: ['INSTAGRAM_POST', 'EMAIL'],
            languages: ['el'],
            pageKey: null,
            pagePaths: null,
            partnerName: null,
            utmSource: null,
            utmMedium: null,
        });
    });

    it("sends a page with its paths, a partner's name with Partner, and a source and medium with Other", () => {
        const request = campaignLinksRequest({
            placements: new Set<CampaignPlacement>(['PARTNER', 'OTHER']),
            languages: ['el', 'en'],
            page: WEDDINGS,
            partnerName: 'acme',
            utmSource: 'flyer',
            utmMedium: 'print',
        });

        expect(request).toEqual({
            placements: ['PARTNER', 'OTHER'],
            languages: ['el', 'en'],
            pageKey: 'weddings',
            pagePaths: { en: '/weddings', el: '/el/gamos' },
            partnerName: 'acme',
            utmSource: 'flyer',
            utmMedium: 'print',
        });
    });
});
