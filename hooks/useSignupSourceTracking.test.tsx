import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSignupSourceTracking } from '@/hooks/useSignupSourceTracking';
import { writeConsent } from '@/lib/consent';
import { currentVisitSource, readVisitSourceCookie, rememberVisitSource, VISIT_SOURCE_COOKIE } from '@/lib/signupSource';

const navigation = vi.hoisted(() => ({ pathname: '/', params: {} as Record<string, string> }));
vi.mock('next/navigation', () => ({
    usePathname: () => navigation.pathname,
    useParams: () => navigation.params,
}));

function visit(path: string, referrer = '') {
    window.history.replaceState(null, '', path);
    navigation.pathname = new URL(path, window.location.origin).pathname;
    Object.defineProperty(document, 'referrer', { value: referrer, configurable: true });
}

beforeEach(() => {
    rememberVisitSource(null);
    navigation.params = {};
});

afterEach(() => {
    cleanup();
    document.cookie = `${VISIT_SOURCE_COOKIE}=; Max-Age=0; Path=/`;
    document.cookie = 'sw_consent=; Max-Age=0; Path=/';
    document.body.innerHTML = '';
});

describe('useSignupSourceTracking', () => {
    it('remembers the first visit without storing it when there is no consent', () => {
        visit('/?utm_source=instagram&utm_medium=social', 'https://l.instagram.com/');
        renderHook(() => useSignupSourceTracking());

        expect(currentVisitSource()?.utmSource).toBe('instagram');
        expect(readVisitSourceCookie()).toBeNull();
    });

    it('stores it in the cookie with analytics consent', () => {
        writeConsent({ ads: false, analytics: true });
        visit('/?utm_source=instagram');
        renderHook(() => useSignupSourceTracking());

        expect(readVisitSourceCookie()?.utmSource).toBe('instagram');
    });

    it('reads a carried src and removes it from the address bar', () => {
        const carried = { utmSource: 'ig', utmMedium: null, utmCampaign: null, adClick: false, referrerHost: null, landingPage: '/' };
        visit(`/events/new?next=%2Fhome&src=${encodeURIComponent(JSON.stringify(carried))}`, `${window.location.origin}/`);
        renderHook(() => useSignupSourceTracking());

        expect(currentVisitSource()).toEqual(carried);
        expect(window.location.search).toBe('?next=%2Fhome');
    });

    it('takes over a plain click from a landing page into the app', () => {
        visit('/?utm_source=instagram');
        renderHook(() => useSignupSourceTracking());

        const link = document.createElement('a');
        link.href = '/events/new';
        document.body.append(link);
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        link.dispatchEvent(event);

        // jsdom cannot navigate; the target URL itself is covered by carryClickTarget in Task 1.
        expect(event.defaultPrevented).toBe(true);
    });

    it('leaves clicks alone outside the landing pages', () => {
        visit('/events?utm_source=instagram');
        renderHook(() => useSignupSourceTracking());

        const link = document.createElement('a');
        link.href = '/events/new';
        document.body.append(link);
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        link.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });
});
