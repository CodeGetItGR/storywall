import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCheckout, useExtensionCheckout, useStorageCheckout, useUpgradeCheckout } from '@/hooks/useBilling';
import { writeCampaignAttributionCookie } from '@/lib/campaignAttribution';
import { CAMPAIGN_ATTRIBUTION_COOKIE, CONSENT_COOKIE, writeConsent } from '@/lib/consent';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: vi.fn(), post: (...args: unknown[]) => mocks.post(...args) },
}));

const attribution = { source: 'instagram', medium: 'social', campaign: 'bf-post-el' };

function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function sentBody() {
    expect(mocks.post).toHaveBeenCalledTimes(1);
    return mocks.post.mock.calls[0][1] as Record<string, unknown>;
}

describe('checkout attribution in billing requests', () => {
    beforeEach(() => {
        mocks.post.mockReset();
        mocks.post.mockResolvedValue({});
        writeConsent({ ads: false, analytics: true });
        writeCampaignAttributionCookie({ utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'bf-post-el' });
    });
    afterEach(() => {
        cleanup();
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`;
        document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`;
    });

    it('sends the campaign link when activating an event', async () => {
        const { result } = renderHook(() => useCheckout('event-1'), { wrapper });

        await act(() => result.current.mutateAsync({ requestsImmediateStart: true, acknowledgesWithdrawalTerms: true, termsVersion: 'v1' }));

        expect(sentBody()).toMatchObject({ attribution, termsVersion: 'v1' });
    });

    it('sends the campaign link when upgrading an event', async () => {
        const { result } = renderHook(() => useUpgradeCheckout('event-1'), { wrapper });

        await act(() => result.current.mutateAsync({ targetPlanTierCode: 'PLUS' } as never));

        expect(sentBody()).toMatchObject({ attribution, targetPlanTierCode: 'PLUS' });
    });

    it('sends nothing for an activation without analytics consent', async () => {
        writeConsent({ ads: true, analytics: false });
        const { result } = renderHook(() => useCheckout('event-1'), { wrapper });

        await act(() => result.current.mutateAsync({ requestsImmediateStart: true, acknowledgesWithdrawalTerms: true, termsVersion: 'v1' }));

        expect(sentBody()).not.toHaveProperty('attribution');
    });

    it('does not send it with a storage purchase', async () => {
        const { result } = renderHook(() => useStorageCheckout('event-1'), { wrapper });

        await act(() => result.current.mutateAsync({ storagePackId: 'pack' } as never));

        expect(sentBody()).not.toHaveProperty('attribution');
    });

    it('does not send it with an extension purchase', async () => {
        const { result } = renderHook(() => useExtensionCheckout('event-1'), { wrapper });

        await act(() => result.current.mutateAsync({ coverageOptionId: 'option' } as never));

        expect(sentBody()).not.toHaveProperty('attribution');
    });
});
