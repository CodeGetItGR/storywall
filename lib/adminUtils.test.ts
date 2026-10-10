import { describe, expect, it } from 'vitest';

import { adminErrorMessageKey } from '@/lib/adminUtils';
import { ApiError } from '@/lib/api/client';

describe('adminErrorMessageKey', () => {
    it('maps the module copy errors (3056, 3057, 5156)', () => {
        expect(adminErrorMessageKey(new ApiError(400, { errorCode: 3056 }))).toBe('moduleCopyIncomplete');
        expect(adminErrorMessageKey(new ApiError(400, { errorCode: 3057 }))).toBe('moduleCopyTooLong');
        expect(adminErrorMessageKey(new ApiError(409, { errorCode: 5156 }))).toBe('moduleCopyModuleUnsupported');
    });

    it('explains that only manual-provider orders can be settled by hand (5105)', () => {
        expect(adminErrorMessageKey(new ApiError(409, { errorCode: 5105 }))).toBe('orderNotManual');
    });

    it('names a module the event type does not support instead of a generic error (3006)', () => {
        expect(adminErrorMessageKey(new ApiError(400, { errorCode: 3006 }))).toBe('invalidModuleKey');
    });

    it('points mark-paid at the missing partner details instead of a generic error (5096)', () => {
        expect(adminErrorMessageKey(new ApiError(409, { errorCode: 5096 }))).toBe('collaboratorPayoutDetailsIncomplete');
    });

    it('says the partner card is incomplete when it cannot be turned on (5152)', () => {
        expect(adminErrorMessageKey(new ApiError(409, { errorCode: 5152 }))).toBe('collaboratorBrandingIncomplete');
    });
});
