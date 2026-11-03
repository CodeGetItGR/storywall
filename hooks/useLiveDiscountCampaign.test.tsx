import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import { discountCampaignKeys } from '@/lib/discountCampaign';

const START = new Date('2026-11-03T10:00:00Z');
const campaign = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-03T10:00:05Z' };

function wrapperWith(data: typeof campaign | null) {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, refetchInterval: false } } });
    client.setQueryData(discountCampaignKeys.live(), data);
    function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return Wrapper;
}

describe('useLiveDiscountCampaign', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(START);
        vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('returns the campaign until the second it ends', () => {
        const { result } = renderHook(() => useLiveDiscountCampaign(), { wrapper: wrapperWith(campaign) });
        expect(result.current).toEqual(campaign);

        act(() => {
            vi.advanceTimersByTime(4_000);
        });
        expect(result.current).toEqual(campaign);

        act(() => {
            vi.advanceTimersByTime(1_000);
        });
        expect(result.current).toBeNull();
    });

    it('returns null without a campaign', () => {
        const { result } = renderHook(() => useLiveDiscountCampaign(), { wrapper: wrapperWith(null) });
        expect(result.current).toBeNull();
    });
});
