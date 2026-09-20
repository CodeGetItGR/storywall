import { describe, expect, it } from 'vitest';

import { adminAccountsPath, eligibleProvisioningPlans } from '@/lib/adminAccountProvisioning';
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
        storageBytes: null,
        maxMembers: null,
        autoDeleteMonths: null,
        priceAmountMinor: null,
        priceCurrency: null,
        billingPeriod: null,
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: [],
        paidModules: null,
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        ...overrides,
    };
}

describe('admin account provisioning', () => {
    it('builds a paginated user search with trimmed filters', () => {
        expect(adminAccountsPath({ page: 2, size: 20, query: '  ada  ', email: ' ada@example.com ' })).toBe(
            '/api/users?page=2&size=20&query=ada&email=ada%40example.com'
        );
    });

    it('keeps assignable internal plans for the selected event type', () => {
        const plans = [
            plan({ id: 'later', sortOrder: 2 }),
            plan({ id: 'hidden', isAssignable: false }),
            plan({ id: 'other-type', eventTypeKey: 'BAPTISM' }),
            plan({ id: 'first', sortOrder: 0 }),
        ];

        expect(eligibleProvisioningPlans(plans, 'WEDDING').map(({ id }) => id)).toEqual(['first', 'later']);
    });
});
