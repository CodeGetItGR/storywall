import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnnouncementComposerTrigger } from '@/hooks/useAnnouncementComposerTrigger';
import { openAnnouncementComposerFromHref } from '@/lib/announcementComposer';

const mocks = vi.hoisted(() => ({
    search: 'compose=announcement',
    canAnnounce: true,
    vendorLoading: false,
    open: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/events/e1/feed',
    useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('@/lib/overlayHistory', () => ({
    replacePageUrl: (url: string) => {
        mocks.replace(url);
        mocks.search = new URL(url, 'http://local').search.slice(1);
    },
}));
vi.mock('@/providers/composer/ComposerContext', () => ({
    useComposer: () => ({ canAnnounce: mocks.canAnnounce, openAnnouncementComposer: mocks.open }),
}));
vi.mock('@/providers/EventProvider', () => ({
    useEventContextLoading: () => false,
    useIsHost: () => false,
    useRouteEventId: () => 'e1',
}));
vi.mock('@/hooks/useVendors', () => ({ useMyVendorRole: () => ({ isLoading: mocks.vendorLoading }) }));

beforeEach(() => {
    mocks.search = 'compose=announcement';
    mocks.canAnnounce = true;
    mocks.vendorLoading = false;
    mocks.open.mockReset();
    mocks.replace.mockReset();
});

describe('useAnnouncementComposerTrigger', () => {
    it('drops the param, then opens the composer in Announcement mode', () => {
        const { rerender } = renderHook(() => useAnnouncementComposerTrigger());
        expect(mocks.replace).toHaveBeenCalledWith('/events/e1/feed');
        rerender();
        expect(mocks.open).toHaveBeenCalledTimes(1);
    });

    it("drops a guest's link without opening anything", () => {
        mocks.canAnnounce = false;
        const { rerender } = renderHook(() => useAnnouncementComposerTrigger());
        rerender();
        expect(mocks.replace).toHaveBeenCalledWith('/events/e1/feed');
        expect(mocks.open).not.toHaveBeenCalled();
    });

    it('waits for the vendor role before deciding', () => {
        mocks.vendorLoading = true;
        renderHook(() => useAnnouncementComposerTrigger());
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it('opens in place for a link to the page it is on', () => {
        mocks.search = '';
        window.history.replaceState({}, '', '/events/e1/feed');
        renderHook(() => useAnnouncementComposerTrigger());
        expect(openAnnouncementComposerFromHref('/events/e1/feed?compose=announcement')).toBe(true);
        expect(mocks.open).toHaveBeenCalledTimes(1);
    });
});
