import { describe, expect, it } from 'vitest';

import {
    campaignDestinations,
    campaignLinkFormProblem,
    campaignUrl,
    emptyCampaignLinkForm,
    findCampaignPreset,
    isUtmValue,
    toUtmValue,
} from '@/lib/campaignLinks';
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

describe('campaignLinkFormProblem', () => {
    it('names the first missing value', () => {
        const form = emptyCampaignLinkForm('/');
        expect(campaignLinkFormProblem(form)).toBe('name');
        expect(campaignLinkFormProblem({ ...form, name: 'Bio' })).toBe('campaign');
        expect(campaignLinkFormProblem({ ...form, name: 'Bio', utmCampaign: 'oct' })).toBeNull();
        const partner = findCampaignPreset('partner');
        expect(
            campaignLinkFormProblem({
                ...form,
                preset: 'partner',
                utmSource: partner.source,
                utmMedium: partner.medium,
                name: 'Bio',
                utmCampaign: 'oct',
            }),
        ).toBe('source');
    });
});

describe('campaignDestinations', () => {
    it('starts with each language home page', () => {
        expect(campaignDestinations().slice(0, 2)).toEqual([
            { kind: 'home', path: '/' },
            { kind: 'home', path: '/el' },
        ]);
    });
});
