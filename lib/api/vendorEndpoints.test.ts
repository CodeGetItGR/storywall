import { describe, expect, it } from 'vitest';

import { endpoints } from '@/lib/api/endpoints';
import { getApiErrorMessageKey } from '@/lib/api/errorMessageKeys';
import { ERROR_CODES } from '@/lib/api/errors';

describe('vendor endpoints', () => {
    it('builds every vendor path', () => {
        expect(endpoints.events.vendors('e1')).toBe('/api/events/e1/vendors');
        expect(endpoints.events.vendorLinks('e1')).toBe('/api/events/e1/vendors/links');
        expect(endpoints.events.vendorLinkReset('e1', 'PHOTOGRAPHER')).toBe('/api/events/e1/vendors/links/PHOTOGRAPHER/reset');
        expect(endpoints.events.vendorMe('e1')).toBe('/api/events/e1/vendors/me');
        expect(endpoints.events.vendorById('e1', 'v1')).toBe('/api/events/e1/vendors/v1');
        expect(endpoints.events.vendorClicks('e1', 'v1')).toBe('/api/events/e1/vendors/v1/clicks');
        expect(endpoints.events.playlistSuggestionPlayed('e1', 's1')).toBe('/api/events/e1/playlist-suggestions/s1/played');
        expect(endpoints.me.vendorProfile).toBe('/api/me/vendor-profile');
        expect(endpoints.me.vendorProfileLogo).toBe('/api/me/vendor-profile/logo');
        expect(endpoints.me.vendorProfileDismissPartnerPrompt).toBe('/api/me/vendor-profile/dismiss-partner-prompt');
        expect(endpoints.admin.events.vendors('e1')).toBe('/api/admin/events/e1/vendors');
        expect(endpoints.partnerProgram.applications).toBe('/api/public/partner-applications');
    });

    it('uses the backend error numbers', () => {
        expect(ERROR_CODES.VENDOR_CAPABILITY_MISSING).toBe(4032);
        expect(ERROR_CODES.VENDOR_ACCESS_ENDED).toBe(4033);
        expect(ERROR_CODES.VENDOR_CANNOT_RSVP).toBe(4034);
        expect(ERROR_CODES.VENDOR_LIMIT_REACHED).toBe(5177);
        expect(ERROR_CODES.VENDOR_IS_HOST).toBe(5178);
        expect(ERROR_CODES.ALREADY_A_VENDOR).toBe(5179);
        expect(ERROR_CODES.PARTNER_APPLICATION_PENDING).toBe(5180);
    });

    it('maps every vendor error code to a message key', () => {
        expect(getApiErrorMessageKey(ERROR_CODES.VENDOR_CAPABILITY_MISSING)).toBe('vendorCapabilityMissing');
        expect(getApiErrorMessageKey(ERROR_CODES.VENDOR_ACCESS_ENDED)).toBe('vendorAccessEnded');
        expect(getApiErrorMessageKey(ERROR_CODES.VENDOR_CANNOT_RSVP)).toBe('vendorCannotRsvp');
        expect(getApiErrorMessageKey(ERROR_CODES.VENDOR_LIMIT_REACHED)).toBe('vendorLimitReached');
        expect(getApiErrorMessageKey(ERROR_CODES.VENDOR_IS_HOST)).toBe('vendorIsHost');
        expect(getApiErrorMessageKey(ERROR_CODES.ALREADY_A_VENDOR)).toBe('alreadyAVendor');
        expect(getApiErrorMessageKey(ERROR_CODES.PARTNER_APPLICATION_PENDING)).toBe('partnerApplicationPending');
    });
});
