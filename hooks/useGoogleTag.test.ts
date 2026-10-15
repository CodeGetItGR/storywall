import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGoogleTag } from '@/hooks/useGoogleTag';
import { writeConsent } from '@/lib/consent';
import type { GoogleAdsPurchase } from '@/lib/googleAds';

vi.mock('@/lib/googleAds', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/googleAds')>()),
    GOOGLE_ADS_ID: 'AW-TEST',
}));
vi.mock('@/lib/googleAnalytics', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/googleAnalytics')>()),
    GA_MEASUREMENT_ID: 'G-TEST',
}));
vi.mock('next/navigation', () => ({
    usePathname: () => '/events/evt-1/checkout/success',
    useParams: () => ({ eventId: 'evt-1' }),
}));

type GtagMock = ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;

const ORDER: GoogleAdsPurchase = { id: 'order-1', amountMinor: 4900, currency: 'EUR', firstPurchase: true };
const ADS_ONLY = { ads: true, analytics: false };
const ANALYTICS_ONLY = { ads: false, analytics: true };
const NONE = { ads: false, analytics: false };

function conversions(gtag: GtagMock) {
    return gtag.mock.calls.filter(([command, action]) => command === 'event' && action === 'conversion');
}

function pageviews(gtag: GtagMock) {
    return gtag.mock.calls.filter(([command, action]) => command === 'event' && action === 'page_view');
}

function configuredIds(gtag: GtagMock) {
    return gtag.mock.calls.filter(([command]) => command === 'config').map(([, id]) => id);
}

let gtag: GtagMock;

beforeEach(() => {
    gtag = vi.fn<(...args: unknown[]) => void>();
    window.gtag = gtag;
});

afterEach(() => {
    cleanup();
    delete window.gtag;
    document.cookie = 'sw_consent=; Max-Age=0; Path=/';
});

describe('useGoogleTag purchase', () => {
    it('reports a paid order once gtag.js is ready, and only once', () => {
        writeConsent(ADS_ONLY);
        const { result, rerender } = renderHook(({ purchase }) => useGoogleTag(purchase), { initialProps: { purchase: ORDER } });
        expect(conversions(gtag)).toHaveLength(0);

        act(() => result.current.onReady());
        rerender({ purchase: { ...ORDER } });

        expect(conversions(gtag)).toEqual([
            [
                'event',
                'conversion',
                { send_to: 'AW-TEST/2AceCLvk-ZcdEPye-vdE', transaction_id: 'order-1', value: 49, currency: 'EUR', new_customer: true },
            ],
        ]);
    });

    it('sends no value or new_customer when they are unknown', () => {
        writeConsent(ADS_ONLY);
        const { result } = renderHook(() => useGoogleTag({ id: 'order-2', amountMinor: null, currency: null, firstPurchase: null }));
        act(() => result.current.onReady());

        expect(conversions(gtag)[0][2]).toEqual({ send_to: 'AW-TEST/2AceCLvk-ZcdEPye-vdE', transaction_id: 'order-2' });
    });

    it('tells Google about a returning customer', () => {
        writeConsent(ADS_ONLY);
        const { result } = renderHook(() => useGoogleTag({ ...ORDER, firstPurchase: false }));
        act(() => result.current.onReady());

        expect(conversions(gtag)[0][2]).toMatchObject({ new_customer: false });
    });

    it('reports nothing without Advertising consent', () => {
        writeConsent(ANALYTICS_ONLY);
        const { result } = renderHook(() => useGoogleTag(ORDER));
        act(() => result.current.onReady());

        expect(conversions(gtag)).toHaveLength(0);
    });
});

describe('useGoogleTag analytics', () => {
    beforeEach(() => {
        window.history.replaceState(null, '', '/events/evt-1/checkout/success?session_id=cs_1&utm_source=google');
    });

    afterEach(() => {
        window.history.replaceState(null, '', '/');
    });

    it('sends one page view under its route with Analytics consent', () => {
        writeConsent(ANALYTICS_ONLY);
        const { result, rerender } = renderHook(() => useGoogleTag());
        rerender();

        expect(result.current.scriptTagId).toBe('G-TEST');
        expect(gtag).toHaveBeenCalledWith('config', 'G-TEST', { send_page_view: false });
        expect(gtag).toHaveBeenCalledWith('consent', 'update', expect.objectContaining({ analytics_storage: 'granted', ad_storage: 'denied' }));
        expect(pageviews(gtag)).toEqual([
            [
                'event',
                'page_view',
                {
                    send_to: 'G-TEST',
                    page_location: `${window.location.origin}/events/[eventId]/checkout/success?utm_source=google`,
                    page_referrer: '',
                },
            ],
        ]);
    });

    it('switches Analytics off when the page closes', () => {
        writeConsent(ANALYTICS_ONLY);
        const flags = window as unknown as Record<string, unknown>;
        const { unmount } = renderHook(() => useGoogleTag());
        expect(flags['ga-disable-G-TEST']).toBe(false);

        unmount();

        expect(flags['ga-disable-G-TEST']).toBe(true);
    });

    it('configures only the ids the visitor agreed to', () => {
        writeConsent(ADS_ONLY);
        renderHook(() => useGoogleTag());

        expect(configuredIds(gtag)).toEqual(['AW-TEST']);
        expect(pageviews(gtag)).toHaveLength(0);
    });

    it('loads nothing without consent', () => {
        writeConsent(NONE);
        const { result } = renderHook(() => useGoogleTag());

        expect(result.current.scriptTagId).toBeNull();
        expect(configuredIds(gtag)).toHaveLength(0);
    });
});
