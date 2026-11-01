import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';
import { makeQueryClient, queryRetryDelayMs, shouldRetryQuery } from '@/lib/queryClient';

describe('shouldRetryQuery', () => {
    it('never retries a 4xx, like the business page 403 NOT_A_VENDOR', () => {
        expect(shouldRetryQuery(0, new ApiError(403, { errorCode: ERROR_CODES.NOT_A_VENDOR }))).toBe(false);
        expect(shouldRetryQuery(0, new ApiError(404, null))).toBe(false);
    });

    it('retries a server error or a dropped connection twice', () => {
        expect(shouldRetryQuery(0, new ApiError(500, null))).toBe(true);
        expect(shouldRetryQuery(1, new Error('offline'))).toBe(true);
        expect(shouldRetryQuery(2, new ApiError(500, null))).toBe(false);
    });

    it('is the default for every query', () => {
        expect(makeQueryClient().getDefaultOptions().queries?.retry).toBe(shouldRetryQuery);
    });
});

describe('queryRetryDelayMs', () => {
    it('waits what a busy server asked for', () => {
        expect(queryRetryDelayMs(0, new ApiError(503, { errorCode: 5119, retryAfterSeconds: 5 }))).toBe(5_000);
    });

    it('caps a long advisory at ten seconds', () => {
        expect(queryRetryDelayMs(0, new ApiError(503, { errorCode: 5119, retryAfterSeconds: 60 }))).toBe(10_000);
    });

    it('backs off as usual otherwise', () => {
        expect(queryRetryDelayMs(0, new ApiError(500, null))).toBe(1_000);
        expect(queryRetryDelayMs(1, new Error('x'))).toBe(2_000);
    });
});
