import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getBusyRetryAfterSeconds, getErrorCodeName, getLandingCategoryConflict, getSignupAcceptanceRequiredDetails, ignoreConcurrentModification } from '@/lib/api/errors';

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

describe('ignoreConcurrentModification', () => {
    it('treats a 5128 on a delete as done', async () => {
        await expect(ignoreConcurrentModification(Promise.reject(new ApiError(409, { errorCode: 5128 })))).resolves.toBeUndefined();
    });

    it('passes any other failure on', async () => {
        const error = new ApiError(403, { errorCode: 4001 });
        await expect(ignoreConcurrentModification(Promise.reject(error))).rejects.toBe(error);
    });
});

describe('getErrorCodeName', () => {
    it('names a numeric code the way batch responses do', () => {
        expect(getErrorCodeName(new ApiError(409, { errorCode: 5008 }))).toBe('EVENT_STORAGE_LIMIT_EXCEEDED');
        expect(getErrorCodeName(new ApiError(409, { errorCode: 5141 }))).toBe('STORY_LIVE_LIMIT_REACHED');
        expect(getErrorCodeName(new Error('x'))).toBeUndefined();
    });
});

describe('getBusyRetryAfterSeconds', () => {
    it('reads the wait of a 503, from the body or the header', () => {
        expect(getBusyRetryAfterSeconds(new ApiError(503, { errorCode: 5119, retryAfterSeconds: 5 }))).toBe(5);
        expect(getBusyRetryAfterSeconds(new ApiError(503, null, undefined, '7'))).toBe(7);
    });

    it('is undefined for anything else', () => {
        expect(getBusyRetryAfterSeconds(new ApiError(429, { errorCode: 3010, retryAfterSeconds: 5 }))).toBeUndefined();
        expect(getBusyRetryAfterSeconds(new ApiError(503, null))).toBeUndefined();
    });
});

describe('getLandingCategoryConflict', () => {
    it('reads the type and the category that holds it', () => {
        const error = new ApiError(409, {
            errorCode: ERROR_CODES.LANDING_CATEGORY_TYPE_ASSIGNED,
            details: { eventTypeKey: 'BIRTHDAY', categoryId: 'c1', categoryName: 'First' },
        });
        expect(getLandingCategoryConflict(error)).toEqual({ eventTypeKey: 'BIRTHDAY', categoryId: 'c1', categoryName: 'First' });
    });

    it('ignores other errors and malformed details', () => {
        expect(getLandingCategoryConflict(new ApiError(409, { errorCode: 5147 }))).toBeUndefined();
        expect(
            getLandingCategoryConflict(new ApiError(409, { errorCode: ERROR_CODES.LANDING_CATEGORY_TYPE_ASSIGNED, details: { eventTypeKey: 1 } })),
        ).toBeUndefined();
        expect(getLandingCategoryConflict(new Error('x'))).toBeUndefined();
    });
});
