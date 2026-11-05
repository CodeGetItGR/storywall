import { describe, expect, it } from 'vitest';

import type { DiscountCampaignLiveDto, SiteNoticeLiveDto } from '@/lib/api/types';
import { campaignShowsOver, discountCampaignDismissalKey, plansHref } from '@/lib/discountCampaign';
import { parseDismissals } from '@/lib/siteNoticeDismissals';

const campaign: DiscountCampaignLiveDto = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-08T00:00:00Z' };
const notice = (tone: SiteNoticeLiveDto['tone']) => ({ tone }) as SiteNoticeLiveDto;
const NONE = new Set<string>();

describe('discountCampaignDismissalKey', () => {
    it('has the shape the dismissal cookie keeps', () => {
        const id = '7f3b2c1a-0000-4000-8000-000000000000';
        expect(parseDismissals(discountCampaignDismissalKey(id))).toEqual([`${id}:1`]);
    });
});

describe('campaignShowsOver', () => {
    it('shows to the public and to hosts only', () => {
        expect(campaignShowsOver(campaign, null, 'PUBLIC', NONE)).toBe(true);
        expect(campaignShowsOver(campaign, null, 'HOST', NONE)).toBe(true);
        expect(campaignShowsOver(campaign, null, 'GUEST', NONE)).toBe(false);
        expect(campaignShowsOver(campaign, null, 'ADMIN', NONE)).toBe(false);
        expect(campaignShowsOver(campaign, null, 'PENDING', NONE)).toBe(false);
        expect(campaignShowsOver(campaign, null, null, NONE)).toBe(false);
    });

    it('beats an offer or info notice but not a warning', () => {
        expect(campaignShowsOver(campaign, notice('OFFER'), 'PUBLIC', NONE)).toBe(true);
        expect(campaignShowsOver(campaign, notice('INFO'), 'PUBLIC', NONE)).toBe(true);
        expect(campaignShowsOver(campaign, notice('WARNING'), 'PUBLIC', NONE)).toBe(false);
        expect(campaignShowsOver(campaign, notice('CRITICAL'), 'PUBLIC', NONE)).toBe(false);
    });

    it('stays closed once closed', () => {
        expect(campaignShowsOver(campaign, null, 'PUBLIC', new Set(['c1:1']))).toBe(false);
    });
});

describe('plansHref', () => {
    it("points at the plans on the visitor's language", () => {
        expect(plansHref('en')).toBe('/#pricing');
        expect(plansHref('el')).toBe('/el#pricing');
    });
});
