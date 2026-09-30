import { describe, expect, it } from 'vitest';

import { adminErrorMessageKey } from '@/lib/adminUtils';
import { ApiError } from '@/lib/api/client';

describe('adminErrorMessageKey', () => {
    it('explains that only manual-provider orders can be settled by hand (5105)', () => {
        expect(adminErrorMessageKey(new ApiError(409, { errorCode: 5105 }))).toBe('orderNotManual');
    });
});
