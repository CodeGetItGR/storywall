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
const profileQuery = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useVendorProfile', () => ({ useVendorProfile: profileQuery }));
vi.mock('@/hooks/useBusinessSectionTarget', () => ({ useBusinessSectionTarget: () => undefined }));
vi.mock('@/hooks/useVendorServicesSection', () => ({ useVendorServicesSection: () => ({}) }));
vi.mock('@/hooks/useBusinessContact', () => ({ useBusinessContact: () => ({}) }));
vi.mock('@/hooks/useBecomePartner', () => ({ useBecomePartner: () => ({}) }));

const overview: BusinessOverviewDto = {
    partner: false,
    showPartnerPrompt: true,
    vendorType: 'PHOTOGRAPHER',
    totals: { events: 2, guests: 10, listTaps: 3 },
};

function withOverview(state: { data?: BusinessOverviewDto; error?: unknown }) {
    overviewQuery.mockReturnValue({ data: state.data, error: state.error ?? null, isLoading: false, refetch: vi.fn() });
}

describe('useBusinessPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        portalQuery.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });
        profileQuery.mockReturnValue({ data: null, isSuccess: true, isError: false, fetchStatus: 'idle', refetch: vi.fn() });
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

    it('gives a partner without vendor data their partner name and earnings', () => {
        withOverview({ data: { ...overview, partner: true, showPartnerPrompt: false, vendorType: undefined } });
        portalQuery.mockReturnValue({
            data: { name: 'Villa Rosa', totals: [{ currency: 'EUR', accruedMinor: 500, paidMinor: 100 }], tierProgress: null, cardPreview: null },
            error: null,
            isLoading: false,
            refetch: vi.fn(),
        });
        const { result } = renderHook(() => useBusinessPage());

        expect(result.current.name).toBe('Villa Rosa');
        expect(result.current.earnings).toEqual({
            state: 'ready',
            balances: [{ currency: 'EUR', earnedMinor: 500, paidMinor: 100, owedMinor: 400 }],
            tierProgress: null,
        });
        expect(result.current.needsProfile).toBe(true);
    });

    it('reads why the partner data was refused, and retries it', () => {
        const refetch = vi.fn();
        withOverview({ data: { ...overview, partner: true } });
        portalQuery.mockReturnValue({
            data: undefined,
            error: new ApiError(403, { errorCode: ERROR_CODES.PARTNER_EMAIL_NOT_VERIFIED }),
            isLoading: false,
            refetch,
        });
        const { result } = renderHook(() => useBusinessPage());

        expect(result.current.earnings).toEqual({ state: 'notVerified' });
        act(() => result.current.retryEarnings());
        expect(refetch).toHaveBeenCalledOnce();
    });

    it('keeps the details sheet shut while the profile loads or after it failed', () => {
        withOverview({ data: overview });
        profileQuery.mockReturnValue({ data: undefined, isSuccess: false, isError: false, fetchStatus: 'fetching', refetch: vi.fn() });
        const loading = renderHook(() => useBusinessPage());
        expect(loading.result.current.profileState).toBe('loading');
        expect(loading.result.current.needsProfile).toBe(false);
        act(() => loading.result.current.openProfile());
        expect(loading.result.current.profileOpen).toBe(false);

        profileQuery.mockReturnValue({ data: undefined, isSuccess: false, isError: true, fetchStatus: 'idle', refetch: vi.fn() });
        const failed = renderHook(() => useBusinessPage());
        expect(failed.result.current.profileState).toBe('failed');
        expect(failed.result.current.needsProfile).toBe(false);
        act(() => failed.result.current.openProfile());
        expect(failed.result.current.profileOpen).toBe(false);
    });

    it('opens the details sheet once the profile read finished, even with no profile', () => {
        withOverview({ data: overview });
        const { result } = renderHook(() => useBusinessPage());
        expect(result.current.needsProfile).toBe(true);
        act(() => result.current.openProfile());
        expect(result.current.profileOpen).toBe(true);
    });
});
