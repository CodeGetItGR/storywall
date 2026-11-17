import { describe, expect, it } from 'vitest';

import { adminErrorMessageKey, adminServerDetail } from '@/lib/adminUtils';
import { ApiError } from '@/lib/api/client';

describe('adminErrorMessageKey', () => {
    it('maps the campaign errors (3123, 4040, 5224, 5225, 5226)', () => {
        expect(adminErrorMessageKey(new ApiError(400, { errorCode: 3123 }))).toBe('discountCampaignInvalid');
        expect(adminErrorMessageKey(new ApiError(403, { errorCode: 4040 }))).toBe('campaignDiscountAdminOnly');
        expect(adminErrorMessageKey(new ApiError(409, { errorCode: 5224 }))).toBe('discountCampaignLinkNameTaken');
        expect(adminErrorMessageKey(new ApiError(409, { errorCode: 5225 }))).toBe('campaignLinkMoveDiscount');
        expect(adminErrorMessageKey(new ApiError(409, { errorCode: 5226 }))).toBe('campaignClosedForLinks');
    });

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

    it('names each test notification refusal (5186, 9003, 9004)', () => {
        expect(adminErrorMessageKey(new ApiError(409, { errorCode: 5186 }))).toBe('pushNotEnabled');
        expect(adminErrorMessageKey(new ApiError(503, { errorCode: 9003 }))).toBe('pushUnavailable');
        expect(adminErrorMessageKey(new ApiError(502, { errorCode: 9004 }))).toBe('pushSendFailed');
    });
});

describe('adminServerDetail', () => {
    it("shows the server's text for a plan change a discount campaign makes too cheap (5207)", () => {
        const detail = 'Campaign Black Friday makes this price too cheap to charge.';
        expect(adminServerDetail(new ApiError(409, { status: 409, title: 'Conflict', errorCode: 5207, detail }))).toBe(detail);
    });

    it('leaves every other error to its own message', () => {
        expect(adminServerDetail(new ApiError(409, { status: 409, title: 'Conflict', errorCode: 5205, detail: 'x' }))).toBeNull();
        expect(adminServerDetail(new Error('network'))).toBeNull();
    });
});
