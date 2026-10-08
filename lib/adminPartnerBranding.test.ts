import { describe, expect, it } from 'vitest';

import { brandingRequestFromFormData, reportDateInputValue, reportRangeBound } from '@/lib/adminPartnerBranding';
import { getApiErrorMessageKey } from '@/lib/api/errorMessageKeys';

function formData(entries: Record<string, string>): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.set(key, value);
    return data;
}

describe('brandingRequestFromFormData', () => {
    it('sends every field, trimmed', () => {
        expect(
            brandingRequestFromFormData(
                formData({
                    displayName: '  Barn Venue ',
                    role: 'VENUE',
                    taglineEl: 'Αγροτικός χώρος',
                    taglineEn: 'A barn by the sea',
                    servicesEl: 'Δεξιώσεις',
                    servicesEn: 'Receptions',
                }),
            ),
        ).toEqual({
            displayName: 'Barn Venue',
            role: 'VENUE',
            taglineEl: 'Αγροτικός χώρος',
            taglineEn: 'A barn by the sea',
            servicesEl: 'Δεξιώσεις',
            servicesEn: 'Receptions',
        });
    });

    it('clears blank fields and an unknown role, since the save replaces everything', () => {
        expect(brandingRequestFromFormData(formData({ displayName: '   ', role: 'ASTRONAUT' }))).toEqual({
            displayName: null,
            role: null,
            taglineEl: null,
            taglineEn: null,
            servicesEl: null,
            servicesEn: null,
        });
    });
});

describe('partner branding error messages', () => {
    it('maps an incomplete partner card (5152) and an outdated notice (5153)', () => {
        expect(getApiErrorMessageKey(5152)).toBe('collaboratorBrandingIncomplete');
        expect(getApiErrorMessageKey(5153)).toBe('partnerBrandingNoticeOutdated');
    });
});

describe('report range', () => {
    it('covers whole days in UTC', () => {
        expect(reportRangeBound('2026-10-01', 'from')).toBe('2026-10-01T00:00:00Z');
        expect(reportRangeBound('2026-10-09', 'to')).toBe('2026-10-09T23:59:59Z');
    });

    it('leaves an empty or partial date to the server default', () => {
        expect(reportRangeBound('', 'from')).toBeNull();
        expect(reportRangeBound('2026-10', 'to')).toBeNull();
    });

    it('shows the server range in the date inputs', () => {
        expect(reportDateInputValue('2026-09-09T10:15:00Z')).toBe('2026-09-09');
        expect(reportDateInputValue(undefined)).toBe('');
    });
});
