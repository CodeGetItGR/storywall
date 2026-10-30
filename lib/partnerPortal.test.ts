import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';
import { partnerPortalBlock } from '@/lib/partnerPortal';

describe('partnerPortalBlock', () => {
    it('reads the two refusals', () => {
        expect(partnerPortalBlock(new ApiError(403, { errorCode: ERROR_CODES.PARTNER_EMAIL_NOT_VERIFIED }))).toBe('notVerified');
        expect(partnerPortalBlock(new ApiError(403, { errorCode: ERROR_CODES.PARTNER_NOT_LINKED }))).toBe('notLinked');
    });

    it('leaves every other failure to the error state', () => {
        expect(partnerPortalBlock(new ApiError(500, { errorCode: 9001 }))).toBeNull();
        expect(partnerPortalBlock(new Error('offline'))).toBeNull();
        expect(partnerPortalBlock(null)).toBeNull();
    });
});
