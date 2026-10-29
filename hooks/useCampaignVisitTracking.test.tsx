import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCampaignVisitTracking } from '@/hooks/useCampaignVisitTracking';
import { currentCampaign, rememberCampaign } from '@/lib/campaignVisits';

const navigation = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));

const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 204 })));

function visit(path: string) {
    window.history.replaceState(null, '', path);
    navigation.pathname = new URL(path, window.location.origin).pathname;
}

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockClear();
    rememberCampaign(null);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('useCampaignVisitTracking', () => {
    it('sends one visit for a landing page reached from a campaign link and remembers it', () => {
        visit('/el?utm_source=instagram&utm_medium=social&utm_campaign=spring');
        renderHook(() => useCampaignVisitTracking());

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({
            kind: 'VISIT',
            utmSource: 'instagram',
            utmMedium: 'social',
            utmCampaign: 'spring',
            language: 'el',
        });
        expect(currentCampaign()?.utmCampaign).toBe('spring');
    });

    it('sends nothing without a campaign', () => {
        visit('/el');
        renderHook(() => useCampaignVisitTracking());
        expect(fetchMock).not.toHaveBeenCalled();
        expect(currentCampaign()).toBeNull();
    });

    it('sends nothing outside the landing pages', () => {
        visit('/register?utm_source=instagram&utm_medium=social&utm_campaign=spring');
        renderHook(() => useCampaignVisitTracking());
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps the campaign across an in-site navigation without utm values', () => {
        visit('/?utm_source=instagram&utm_medium=social&utm_campaign=spring');
        const { rerender } = renderHook(() => useCampaignVisitTracking());
        visit('/weddings');
        rerender();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(currentCampaign()?.utmCampaign).toBe('spring');
    });

    it('writes no cookie and nothing to storage', () => {
        visit('/?utm_source=instagram&utm_medium=social&utm_campaign=spring');
        renderHook(() => useCampaignVisitTracking());
        expect(document.cookie).toBe('');
        expect(window.localStorage.length).toBe(0);
        expect(window.sessionStorage.length).toBe(0);
    });
});
