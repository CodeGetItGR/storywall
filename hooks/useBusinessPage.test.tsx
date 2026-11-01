import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBusinessPage } from '@/hooks/useBusinessPage';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';
import type { BusinessOverviewDto } from '@/lib/api/types';

const overviewQuery = vi.hoisted(() => vi.fn());
const portalQuery = vi.hoisted(() => vi.fn());
const eventsQuery = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useBusinessOverview', () => ({ useBusinessOverview: overviewQuery }));
vi.mock('@/hooks/usePartnerPortal', () => ({ usePartnerPortal: portalQuery }));
vi.mock('@/hooks/useBusinessEvents', () => ({ useBusinessEvents: eventsQuery }));
vi.mock('@/hooks/useVendorProfile', () => ({
    useVendorProfile: () => ({ data: null, isSuccess: true, isError: false, fetchStatus: 'idle' }),
}));
vi.mock('@/hooks/useVendorServicesSection', () => ({ useVendorServicesSection: () => ({}) }));
vi.mock('@/hooks/useBusinessContact', () => ({ useBusinessContact: () => ({}) }));
vi.mock('@/hooks/useBecomePartner', () => ({ useBecomePartner: () => ({}) }));

const overview: BusinessOverviewDto = {
    partner: false,
    vendorType: 'PHOTOGRAPHER',
    totals: { events: 2, guests: 10, listTaps: 3 },
};

function withOverview(state: { data?: BusinessOverviewDto; error?: unknown }) {
    overviewQuery.mockReturnValue({ data: state.data, error: state.error ?? null, isLoading: false, refetch: vi.fn() });
}

describe('useBusinessPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        portalQuery.mockReturnValue({ data: undefined });
        eventsQuery.mockReturnValue({ events: [] });
    });

    it('reports a 403 for a non-vendor as notVendor, not as a failed load', () => {
        withOverview({ error: new ApiError(403, { errorCode: ERROR_CODES.NOT_A_VENDOR }) });
        const { result } = renderHook(() => useBusinessPage());

        expect(result.current.notVendor).toBe(true);
        expect(result.current.loadFailed).toBe(false);
    });

    it('reports any other error as a failed load', () => {
        withOverview({ error: new ApiError(500, { errorCode: ERROR_CODES.INTERNAL_ERROR }) });
        const { result } = renderHook(() => useBusinessPage());

        expect(result.current.notVendor).toBe(false);
        expect(result.current.loadFailed).toBe(true);
    });

    it('reads the partner page only for partners', () => {
        withOverview({});
        renderHook(() => useBusinessPage());
        expect(portalQuery).toHaveBeenLastCalledWith(false);

        withOverview({ data: overview });
        renderHook(() => useBusinessPage());
        expect(portalQuery).toHaveBeenLastCalledWith(false);
        expect(eventsQuery).toHaveBeenLastCalledWith(true);

        withOverview({ data: { ...overview, partner: true } });
        renderHook(() => useBusinessPage());
        expect(portalQuery).toHaveBeenLastCalledWith(true);
    });

    it('retries by refetching the overview', () => {
        const refetch = vi.fn();
        overviewQuery.mockReturnValue({ data: undefined, error: new ApiError(500, {}), isLoading: false, refetch });
        const { result } = renderHook(() => useBusinessPage());
        act(() => result.current.retry());

        expect(refetch).toHaveBeenCalledOnce();
    });
});
