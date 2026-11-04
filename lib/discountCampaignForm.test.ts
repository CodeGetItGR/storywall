import { describe, expect, it } from 'vitest';

import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { EMPTY_DISCOUNT_CAMPAIGN_FORM, formOfCampaign, isCampaignOver, requestOfCampaignForm } from '@/lib/discountCampaignForm';

describe('requestOfCampaignForm', () => {
    const form = { name: ' Black Friday ', percent: '12.5', label: '  ', linkName: 'black-friday', startsAt: '', endsAt: '2026-11-30T23:59' };

    it('sends an empty start as null and an empty label as null', () => {
        const request = requestOfCampaignForm(form);

        expect(request.name).toBe('Black Friday');
        expect(request.percent).toBe(12.5);
        expect(request.label).toBeNull();
        expect(request.startsAt).toBeNull();
        expect(request.endsAt).toBe(new Date('2026-11-30T23:59').toISOString());
    });

    it('sends a set start as an instant', () => {
        expect(requestOfCampaignForm({ ...form, startsAt: '2026-11-28T00:00' }).startsAt).toBe(new Date('2026-11-28T00:00').toISOString());
    });
});

describe('formOfCampaign', () => {
    it('round trips a saved campaign', () => {
        const campaign: AdminDiscountCampaignDto = {
            id: 'c1',
            name: 'Black Friday',
            percent: 20,
            label: null,
            linkName: 'black-friday',
            startsAt: '2026-11-28T00:00:00Z',
            endsAt: '2026-11-30T00:00:00Z',
            status: 'SCHEDULED',
            createdAt: '2026-11-01T00:00:00Z',
        };

        const form = formOfCampaign(campaign);

        expect(form.percent).toBe('20');
        expect(form.label).toBe('');
        expect(requestOfCampaignForm(form).endsAt).toBe(new Date(campaign.endsAt).toISOString());
    });

    it('starts empty for a new one', () => {
        expect(EMPTY_DISCOUNT_CAMPAIGN_FORM.name).toBe('');
    });
});

describe('isCampaignOver', () => {
    it('is true for an ended or stopped campaign only', () => {
        expect(isCampaignOver('ENDED')).toBe(true);
        expect(isCampaignOver('OFF')).toBe(true);
        expect(isCampaignOver('LIVE')).toBe(false);
        expect(isCampaignOver('SCHEDULED')).toBe(false);
        expect(isCampaignOver(null)).toBe(false);
    });
});
