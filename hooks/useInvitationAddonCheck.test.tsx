import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInvitationAddonCheck } from '@/hooks/useInvitationAddonCheck';
import { ApiError } from '@/lib/api/client';
import type { PaidServiceResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ billing: vi.fn(), modules: vi.fn(), withdrawals: vi.fn(), incident: { value: false } }));

const saveMyDate = {
    id: 'svc-SMD',
    code: 'SMD',
    kind: 'MODULE_UNLOCK',
    name: 'Online invitation',
    description: null,
    sortOrder: 0,
    isAssignable: true,
    isPublic: true,
    priceAmountMinor: 2900,
    priceCurrency: 'EUR',
    billingPeriod: 'ONE_TIME',
    grantsStorageBytes: null,
    grantsModuleKey: 'save_my_date',
    planTierIds: [],
} as PaidServiceResponseDto;

vi.mock('@/hooks/useAppConfig', () => ({
    APP_CONFIG_STALE_TIME: 0,
    appConfigKeys: { all: ['app-config'] },
    fetchAppConfig: async () => ({
        paidServices: [saveMyDate],
        modules: [{ moduleKey: 'save_my_date', isEnabled: true, sortOrder: 0 }],
        planTiers: [{ id: 'plan-lite', code: 'LITE', scope: 'EVENT', sortOrder: 0, moduleKeys: ['posts'] }],
    }),
}));
vi.mock('@/hooks/useBilling', () => ({
    billingKeys: { event: (id: string) => ['events', id, 'billing'] },
    withdrawalKeys: { history: (id: string) => ['events', id, 'withdrawals'] },
    fetchEventBilling: mocks.billing,
    fetchEventWithdrawals: mocks.withdrawals,
}));
vi.mock('@/hooks/useEventModules', () => ({
    eventModuleKeys: { list: (id: string) => ['events', id, 'modules'] },
    fetchEventModules: mocks.modules,
}));
vi.mock('@/lib/incident', () => ({
    get INCIDENT_MODE() {
        return mocks.incident.value;
    },
}));

function check(eventId = 'evt-1') {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(() => useInvitationAddonCheck(), { wrapper }).result.current(eventId);
}

describe('useInvitationAddonCheck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.incident.value = false;
        mocks.billing.mockResolvedValue({ eventStatus: 'ACTIVE', planTierCode: 'LITE', addons: [], orders: [] });
        mocks.modules.mockResolvedValue([{ moduleKey: 'posts', isEnabled: true }]);
        mocks.withdrawals.mockResolvedValue([]);
    });

    it('opens the step when the plan sells the invitation', async () => {
        await expect(check()).resolves.toBe(true);
        expect(mocks.billing).toHaveBeenCalledWith('evt-1');
    });

    it('stays shut for someone who cannot read billing, such as a co-host', async () => {
        mocks.billing.mockRejectedValue(new ApiError(403, { errorCode: 4001 }));
        await expect(check()).resolves.toBe(false);
    });

    it('stays shut while a withdrawal is under review', async () => {
        mocks.withdrawals.mockResolvedValue([{ status: 'HELD', scope: 'EVENT' }]);
        await expect(check()).resolves.toBe(false);
    });

    it('stays shut when the event already has the invitation', async () => {
        mocks.modules.mockResolvedValue([{ moduleKey: 'save_my_date', isEnabled: true }]);
        await expect(check()).resolves.toBe(false);
    });

    it('stays shut in incident mode', async () => {
        mocks.incident.value = true;
        await expect(check()).resolves.toBe(false);
        expect(mocks.billing).not.toHaveBeenCalled();
    });
});
