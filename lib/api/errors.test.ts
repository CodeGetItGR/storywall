import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { getSignupAcceptanceRequiredDetails } from '@/lib/api/errors';

describe('getSignupAcceptanceRequiredDetails', () => {
    it('reads both versions off a 3044', () => {
        const error = new ApiError(400, {
            errorCode: 3044,
            details: { currentTermsVersion: '2026-10-04', currentGuidelinesVersion: '2026-09-30' },
        });

        expect(getSignupAcceptanceRequiredDetails(error)).toEqual({ currentTermsVersion: '2026-10-04', currentGuidelinesVersion: '2026-09-30' });
    });

    it('is null when a version is missing', () => {
        const error = new ApiError(400, { errorCode: 3044, details: { currentTermsVersion: '2026-10-04' } });

        expect(getSignupAcceptanceRequiredDetails(error)).toBeNull();
    });

    it('is null for any other error', () => {
        const error = new ApiError(400, {
            errorCode: 3043,
            details: { currentTermsVersion: '2026-10-04', currentGuidelinesVersion: '2026-09-30' },
        });

        expect(getSignupAcceptanceRequiredDetails(error)).toBeNull();
        expect(getSignupAcceptanceRequiredDetails(new Error('x'))).toBeNull();
    });
});
