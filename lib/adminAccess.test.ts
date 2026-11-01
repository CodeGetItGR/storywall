import { describe, expect, it } from 'vitest';

import { isAccountRole } from '@/lib/accountRole';
import { adminHomeTab, canOpenAdminTab, canUseAdminConsole, resolveAdminTab } from '@/lib/adminAccess';

describe('admin console access', () => {
    it('lets admins and marketing in', () => {
        expect(canUseAdminConsole('ADMIN')).toBe(true);
        expect(canUseAdminConsole('MARKETING')).toBe(true);
        expect(canUseAdminConsole('USER')).toBe(false);
        expect(canUseAdminConsole('GUEST')).toBe(false);
        expect(canUseAdminConsole(null)).toBe(false);
    });

    it('shows marketing only the marketing group and phones', () => {
        for (const tab of ['outreach', 'campaigns', 'campaignOverview', 'discountCodes', 'guestOffer', 'appReviews', 'phones'] as const) {
            expect(canOpenAdminTab('MARKETING', tab)).toBe(true);
        }
        for (const tab of ['metrics', 'orders', 'withdrawals', 'collaborations', 'accounts', 'errorEvents', 'partnerApplications'] as const) {
            expect(canOpenAdminTab('MARKETING', tab)).toBe(false);
        }
    });

    it('shows admins everything', () => {
        expect(canOpenAdminTab('ADMIN', 'withdrawals')).toBe(true);
        expect(canOpenAdminTab('ADMIN', 'outreach')).toBe(true);
    });

    it('sends a hidden section to the role’s home', () => {
        expect(adminHomeTab('MARKETING')).toBe('outreach');
        expect(adminHomeTab('ADMIN')).toBe('metrics');
        expect(resolveAdminTab('MARKETING', 'orders')).toBe('outreach');
        expect(resolveAdminTab('MARKETING', 'campaigns')).toBe('campaigns');
        expect(resolveAdminTab('ADMIN', 'orders')).toBe('orders');
    });

    it('treats marketing as a signed-in account', () => {
        expect(isAccountRole('MARKETING')).toBe(true);
        expect(isAccountRole('USER')).toBe(true);
        expect(isAccountRole('GUEST')).toBe(false);
    });
});
