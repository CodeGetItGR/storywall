import { describe, expect, it } from 'vitest';

import { accountEmailChange, accountEmailChangeErrorKey, adminAccountsPath, eligibleProvisioningPlans } from '@/lib/adminAccountProvisioning';
import { ApiError } from '@/lib/api/client';
import type { PlanTierResponseDto } from '@/lib/api/types';

function plan(overrides: Partial<PlanTierResponseDto>): PlanTierResponseDto {
    return {
        id: 'plan-1',
        code: 'PROMO',
        scope: 'EVENT',
        name: 'Promo',
        description: null,
        sortOrder: 1,
        isDefault: false,
        isAssignable: true,
        isPublic: false,
        isGiftable: true,
        storageBytes: null,
        maxMembers: null,
        priceAmountMinor: null,
        priceCurrency: 'EUR',
        billingPeriod: null,
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: [],
        paidModules: null,
        moduleConfigs: null,
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        initialOptions: [{ id: 'option-6', kind: 'INITIAL', months: 6, priceAmountMinor: 4_900, promoPriceAmountMinor: null, sortOrder: 0, active: true }],
        extensionOptions: [],
        ...overrides,
    };
}

describe('admin account provisioning', () => {
    it('builds a paginated user search with trimmed filters', () => {
        expect(adminAccountsPath({ page: 2, size: 20, query: '  ada  ', email: ' ada@example.com ' })).toBe(
            '/api/users?page=2&size=20&query=ada&email=ada%40example.com',
        );
    });

    it('keeps assignable internal plans for the selected event type', () => {
        const plans = [
            plan({ id: 'later', sortOrder: 2 }),
            plan({ id: 'hidden', isAssignable: false }),
            plan({ id: 'other-type', eventTypeKey: 'BAPTISM' }),
            plan({ id: 'first', sortOrder: 0 }),
            plan({ id: 'no-durations', initialOptions: [] }),
            plan({
                id: 'retired-durations',
                initialOptions: [
                    { ...{ id: 'option-6', kind: 'INITIAL', months: 6, priceAmountMinor: 4_900, promoPriceAmountMinor: null, sortOrder: 0, active: true }, active: false },
                ],
            }),
        ];

        expect(eligibleProvisioningPlans(plans, 'WEDDING').map(({ id }) => id)).toEqual(['first', 'later']);
    });
});

describe('admin email change', () => {
    it('sends a changed email in lower case', () => {
        expect(accountEmailChange('old@example.com', ' New@Example.com ')).toEqual({ email: 'new@example.com' });
    });

    it('sends nothing when empty or unchanged', () => {
        expect(accountEmailChange('old@example.com', '  ')).toBeNull();
        expect(accountEmailChange('old@example.com', 'OLD@example.com')).toBeNull();
        expect(accountEmailChange(null, 'new@example.com')).toEqual({ email: 'new@example.com' });
    });

    it('names a taken or malformed address', () => {
        expect(accountEmailChangeErrorKey(new ApiError(409, { errorCode: 5002 }))).toBe('emailTaken');
        expect(accountEmailChangeErrorKey(new ApiError(400, { errorCode: 3001 }))).toBe('emailInvalid');
        expect(accountEmailChangeErrorKey(new ApiError(403, {}))).toBeNull();
        expect(accountEmailChangeErrorKey(new Error('network'))).toBeNull();
    });
});
