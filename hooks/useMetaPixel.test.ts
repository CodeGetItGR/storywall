import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { type MetaPixelOptions, useMetaPixel } from '@/hooks/useMetaPixel';
import { writeConsent } from '@/lib/consent';
import type { MetaPixelPurchase } from '@/lib/metaPixel';

vi.mock('@/lib/metaPixel', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/metaPixel')>()),
    META_PIXEL_ID: 'PIXEL-TEST',
}));

let pathname = '/';
vi.mock('next/navigation', () => ({
    usePathname: () => pathname,
}));

const ORDER: MetaPixelPurchase = { id: 'order-1', amountMinor: 4900, currency: 'EUR' };
const ADS_ONLY = { ads: true, analytics: false };
const ANALYTICS_ONLY = { ads: false, analytics: true };

// The commands the page queued for fbevents.js, which never loads in tests.
function queued(): unknown[][] {
    return (window.fbq?.queue ?? []) as unknown[][];
}

function commands(name: string, event?: string) {
    return queued().filter(([command, action]) => command === name && (event === undefined || action === event));
}

function renderPixel(initialProps: MetaPixelOptions) {
    return renderHook((props: MetaPixelOptions) => useMetaPixel(props), { initialProps });
}

afterEach(() => {
    cleanup();
    delete window.fbq;
    delete window._fbq;
    pathname = '/';
    document.cookie = 'sw_consent=; Max-Age=0; Path=/';
});

describe('useMetaPixel consent', () => {
    it('loads nothing without a choice or with advertising turned off', () => {
        const { result } = renderPixel({ email: null });
        expect(result.current).toBeNull();
        expect(window.fbq).toBeUndefined();

        writeConsent(ANALYTICS_ONLY);
        const { result: analyticsOnly } = renderPixel({ email: null });
        expect(analyticsOnly.current).toBeNull();
        expect(window.fbq).toBeUndefined();
    });

    it('starts the pixel with consent to advertising, with automatic setup off', () => {
        writeConsent(ADS_ONLY);
        const { result } = renderPixel({ email: null });

        expect(result.current).toBe('PIXEL-TEST');
        expect(window.fbq?.disablePushState).toBe(true);
        expect(commands('consent')).toEqual([['consent', 'grant']]);
        expect(commands('set')).toEqual([['set', 'autoConfig', false, 'PIXEL-TEST']]);
        expect(commands('init')).toEqual([['init', 'PIXEL-TEST']]);
    });

    it('revokes once the visitor turns advertising off', () => {
        writeConsent(ADS_ONLY);
        const { result } = renderHook(() => ({ pixel: useMetaPixel({ email: null }), consent: useCookieConsent() }));

        act(() => result.current.consent.save(ANALYTICS_ONLY));

        expect(result.current.pixel).toBeNull();
        expect(commands('consent')).toEqual([
            ['consent', 'grant'],
            ['consent', 'revoke'],
        ]);
    });
});

describe('useMetaPixel matching', () => {
    it('waits for the email before starting, then sends it normalised', () => {
        writeConsent(ADS_ONLY);
        const { result, rerender } = renderPixel({ email: undefined });
        expect(result.current).toBeNull();
        expect(commands('init')).toHaveLength(0);
        expect(commands('track', 'PageView')).toHaveLength(0);

        rerender({ email: ' Host@Example.TEST ' });

        expect(commands('init')).toEqual([['init', 'PIXEL-TEST', { em: 'host@example.test' }]]);
        expect(commands('track', 'PageView')).toHaveLength(1);
    });

    it('initialises once, whatever happens later', () => {
        writeConsent(ADS_ONLY);
        const { rerender } = renderPixel({ email: null });
        rerender({ email: 'host@example.test' });

        expect(commands('init')).toEqual([['init', 'PIXEL-TEST']]);
    });
});

describe('useMetaPixel events', () => {
    it('sends one page view per path', () => {
        writeConsent(ADS_ONLY);
        const { rerender } = renderPixel({ email: null });
        rerender({ email: null });
        expect(commands('track', 'PageView')).toHaveLength(1);

        pathname = '/for-business';
        rerender({ email: null });
        expect(commands('track', 'PageView')).toHaveLength(2);
    });

    it('reports a paid order once, with its value and order id', () => {
        writeConsent(ADS_ONLY);
        const { rerender } = renderPixel({ email: 'host@example.test', purchase: null });
        expect(commands('track', 'Purchase')).toHaveLength(0);

        rerender({ email: 'host@example.test', purchase: ORDER });
        rerender({ email: 'host@example.test', purchase: { ...ORDER } });

        expect(commands('track', 'Purchase')).toEqual([['track', 'Purchase', { value: 49, currency: 'EUR' }, { eventID: 'order-1' }]]);
    });

    it('reports an order without an amount without a value', () => {
        writeConsent(ADS_ONLY);
        renderPixel({ email: null, purchase: { ...ORDER, amountMinor: null } });

        expect(commands('track', 'Purchase')).toEqual([['track', 'Purchase', {}, { eventID: 'order-1' }]]);
    });

    it('reports nothing without consent to advertising', () => {
        writeConsent(ANALYTICS_ONLY);
        renderPixel({ email: 'host@example.test', purchase: ORDER });

        expect(window.fbq).toBeUndefined();
    });
});
