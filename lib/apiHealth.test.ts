import { afterEach, describe, expect, it, vi } from 'vitest';

import { isApiDown, reportApiNetworkError, reportApiResponse, resetApiHealth, subscribeApiHealth } from '@/lib/apiHealth';

describe('apiHealth', () => {
    afterEach(() => resetApiHealth());

    it('flags the API as down after two failures in a row', () => {
        reportApiResponse(503);
        expect(isApiDown()).toBe(false);
        reportApiNetworkError();
        expect(isApiDown()).toBe(true);
    });

    it('clears on any answered request, and a 4xx or 500 counts as answered', () => {
        reportApiResponse(502);
        reportApiResponse(504);
        expect(isApiDown()).toBe(true);
        reportApiResponse(404);
        expect(isApiDown()).toBe(false);
        reportApiResponse(503);
        reportApiResponse(500);
        reportApiResponse(503);
        expect(isApiDown()).toBe(false);
    });

    it('tells listeners only when the flag flips', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeApiHealth(listener);
        reportApiResponse(503);
        reportApiResponse(503);
        reportApiResponse(503);
        expect(listener).toHaveBeenCalledTimes(1);
        reportApiResponse(200);
        expect(listener).toHaveBeenCalledTimes(2);
        unsubscribe();
    });
});
