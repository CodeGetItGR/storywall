import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { queryRetryDelayMs } from '@/lib/queryClient';

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
