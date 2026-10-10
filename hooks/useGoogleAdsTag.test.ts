import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGoogleAdsTag } from '@/hooks/useGoogleAdsTag';
import { writeConsent } from '@/lib/consent';
import type { GoogleAdsPurchase } from '@/lib/googleAds';

vi.mock('@/lib/googleAds', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/googleAds')>()),
    GOOGLE_ADS_ID: 'AW-TEST',
}));

const ORDER: GoogleAdsPurchase = { id: 'order-1', amountMinor: 4900, currency: 'EUR' };

function conversions(gtag: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>) {
    return gtag.mock.calls.filter(([command, action]) => command === 'event' && action === 'conversion');
}

describe('useGoogleAdsTag purchase', () => {
    let gtag: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;

    beforeEach(() => {
        gtag = vi.fn<(...args: unknown[]) => void>();
        window.gtag = gtag;
    });

    afterEach(() => {
        cleanup();
        delete window.gtag;
        document.cookie = 'sw_consent=; Max-Age=0; Path=/';
    });

    it('reports a paid order once gtag.js is ready, and only once', () => {
        writeConsent(true);
        const { result, rerender } = renderHook(({ purchase }) => useGoogleAdsTag(purchase), { initialProps: { purchase: ORDER } });
        expect(conversions(gtag)).toHaveLength(0);

        act(() => result.current.onReady());
        rerender({ purchase: { ...ORDER } });

        expect(conversions(gtag)).toEqual([
            ['event', 'conversion', { send_to: 'AW-TEST/2AceCLvk-ZcdEPye-vdE', transaction_id: 'order-1', value: 49, currency: 'EUR' }],
        ]);
    });

    it('sends no value when the amount is unknown', () => {
        writeConsent(true);
        const { result } = renderHook(() => useGoogleAdsTag({ id: 'order-2', amountMinor: null, currency: null }));
        act(() => result.current.onReady());

        expect(conversions(gtag)[0][2]).toEqual({ send_to: 'AW-TEST/2AceCLvk-ZcdEPye-vdE', transaction_id: 'order-2' });
    });

    it('reports nothing without Advertising consent', () => {
        writeConsent(false);
        const { result } = renderHook(() => useGoogleAdsTag(ORDER));
        act(() => result.current.onReady());

        expect(result.current.tagId).toBeNull();
        expect(conversions(gtag)).toHaveLength(0);
    });
});
