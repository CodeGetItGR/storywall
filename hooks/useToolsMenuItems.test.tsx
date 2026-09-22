import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHostMenuItems, useToolsMenuItems } from '@/hooks/useToolsMenuItems';

const mocks = vi.hoisted(() => ({
    activeEvent: null as Record<string, unknown> | null,
    isHost: true,
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('@/hooks/useGiftAccount', () => ({
    useGiftAccount: () => ({ data: null }),
}));

vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => mocks.activeEvent,
    useIsHost: () => mocks.isHost,
    useRouteEventId: () => 'event-1',
}));

function event(overrides: Record<string, unknown> = {}) {
    return {
        id: 'event-1',
        status: 'ACTIVE',
        deletedAt: null,
        modules: ['rsvp', 'gallery', 'wishbook', 'wishlist'].map((moduleKey) => ({ moduleKey, isAvailable: true })),
        ...overrides,
    };
}

describe('useToolsMenuItems', () => {
    beforeEach(() => {
        mocks.isHost = true;
    });

    it('lists every available tool for a live event', () => {
        mocks.activeEvent = event();
        const { result } = renderHook(() => useToolsMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['rsvp', 'schedule', 'gallery', 'wishbook', 'gifts']);
    });

    it('keeps only gallery and wishbook for a deleted event', () => {
        mocks.activeEvent = event({ deletedAt: '2026-09-22T10:00:00Z' });
        const { result } = renderHook(() => useToolsMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['gallery', 'wishbook']);
    });
});

describe('useHostMenuItems', () => {
    it('keeps only manage for a deleted event', () => {
        mocks.activeEvent = event({ deletedAt: '2026-09-22T10:00:00Z' });
        const { result } = renderHook(() => useHostMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['manage']);
    });

    it('still lists manage, both QR pages and help for a live event', () => {
        mocks.activeEvent = event();
        const { result } = renderHook(() => useHostMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['manage', 'galleryQr', 'invitationsQr', 'help']);
    });
});
