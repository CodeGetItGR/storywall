import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { appConfigKeys } from '@/hooks/useAppConfig';
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
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise(() => undefined)),
        );
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

    it('renders the campaign as seeded while hydrating, then hides it once it has ended', () => {
        vi.setSystemTime(new Date('2026-11-03T10:00:06Z'));
        const Wrapper = wrapperWith(campaign);
        function Probe() {
            return <p>{useLiveDiscountCampaign()?.id ?? 'none'}</p>;
        }

        expect(
            renderToString(
                <Wrapper>
                    <Probe />
                </Wrapper>,
            ),
        ).toContain('c1');

        const { result } = renderHook(() => useLiveDiscountCampaign(), { wrapper: Wrapper });
        expect(result.current).toBeNull();
    });

    describe('the prices on an open page', () => {
        const longCampaign = { ...campaign, endsAt: '2026-11-10T10:00:00Z' };

        function setup(data: typeof campaign | null) {
            const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, refetchInterval: false } } });
            client.setQueryData(discountCampaignKeys.live(), data);
            client.setQueryData(appConfigKeys.all, { planTiers: [] });
            const configStale = () => client.getQueryState(appConfigKeys.all)?.isInvalidated ?? false;
            function Wrapper({ children }: { children: ReactNode }) {
                return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
            }
            renderHook(() => useLiveDiscountCampaign(), { wrapper: Wrapper });
            return { client, configStale };
        }

        it('refreshes them when the campaign is stopped', () => {
            const { client, configStale } = setup(longCampaign);
            expect(configStale()).toBe(false);

            act(() => {
                client.setQueryData(discountCampaignKeys.live(), null);
                vi.advanceTimersByTime(1);
            });
            expect(configStale()).toBe(true);
        });

        it('refreshes them when a campaign starts', () => {
            const { client, configStale } = setup(null);

            act(() => {
                client.setQueryData(discountCampaignKeys.live(), longCampaign);
                vi.advanceTimersByTime(1);
            });
            expect(configStale()).toBe(true);
        });

        it('leaves them alone while the campaign stays the same', () => {
            const { client, configStale } = setup(longCampaign);

            act(() => {
                client.setQueryData(discountCampaignKeys.live(), { ...longCampaign });
                vi.advanceTimersByTime(1);
            });
            expect(configStale()).toBe(false);
        });
    });
});
