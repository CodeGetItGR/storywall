import { describe, expect, it } from 'vitest';

import { campaignFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import type { CampaignLinksRequestDto } from '@/lib/api/types';
import { EMPTY_CAMPAIGN_FORM, formOfCampaign, requestOfCampaignForm, suggestLinkName, transliterate } from '@/lib/campaignForm';
import { datetimeLocalValueToIso } from '@/lib/datetime';

const LINKS: CampaignLinksRequestDto = {
    placements: ['INSTAGRAM_POST'],
    languages: ['el', 'en'],
    pageKey: null,
    pagePaths: null,
    partnerName: null,
    utmSource: null,
    utmMedium: null,
};

describe('transliterate', () => {
    it('spells Greek in Latin letters, without accents', () => {
        expect(transliterate('Θεσσαλονίκη')).toBe('thessaloniki');
        expect(transliterate('Ψυχή, χαρά')).toBe('psychi, chara');
    });
});

describe('suggestLinkName', () => {
    it.each([
        ['Καλοκαίρι 2026', 'kalokairi-2026'],
        ['Ουρανός', 'ouranos'],
        ['Γάμος & βάπτιση', 'gamos-vaptisi'],
        ['Launch 50%', 'launch-50'],
        [' — Black Friday! ', 'black-friday'],
    ])('turns "%s" into %s', (name, linkName) => {
        expect(suggestLinkName(name)).toBe(linkName);
    });

    it('keeps to the link name limit', () => {
        expect(suggestLinkName('a'.repeat(80))).toHaveLength(60);
    });
});

describe('requestOfCampaignForm', () => {
    it('sends a saved date back as it was while its field still shows it', () => {
        const saved = campaignFixture({ startsAt: '2026-06-01T07:00:30.123Z' });
        const request = requestOfCampaignForm(formOfCampaign(saved), saved, LINKS);

        expect(request.startsAt).toBe('2026-06-01T07:00:30.123Z');
        expect(request.discount).toEqual({ percent: 50, label: 'Launch offer' });
        // Links are added to a saved campaign from its links drawer.
        expect(request.links).toBeNull();
    });

    it('sends a changed date as the minute in the field', () => {
        const saved = campaignFixture();
        const form = { ...formOfCampaign(saved), endsAt: '2026-07-01T10:30' };

        expect(requestOfCampaignForm(form, saved, null).endsAt).toBe(datetimeLocalValueToIso('2026-07-01T10:30'));
    });

    it('sends a new campaign with its links, and no discount while the switch is off', () => {
        const form = { ...EMPTY_CAMPAIGN_FORM, name: '  Autumn  ', linkName: 'autumn', percent: '20' };

        expect(requestOfCampaignForm(form, null, LINKS)).toEqual({
            name: 'Autumn',
            linkName: 'autumn',
            startsAt: null,
            endsAt: null,
            discount: null,
            links: LINKS,
        });
    });

    it('sends an empty checkout name as none', () => {
        const form = { ...EMPTY_CAMPAIGN_FORM, name: 'Autumn', linkName: 'autumn', discountOn: true, percent: '15', label: '  ' };

        expect(requestOfCampaignForm(form, null, null).discount).toEqual({ percent: 15, label: null });
    });
});
