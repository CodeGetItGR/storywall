import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHostMenuItems, useToolsMenuItems } from '@/hooks/useToolsMenuItems';

const mocks = vi.hoisted(() => ({
    activeEvent: null as Record<string, unknown> | null,
    activeMember: { id: 'm1', isFeatured: false } as Record<string, unknown> | null,
    isHost: true,
    accessMode: 'standard',
}));

vi.mock('@/hooks/useModuleCopy', () => {
    const copy = (moduleKey: string) => ({ name: moduleKey, description: `${moduleKey} description`, cardLabel: moduleKey, Icon: () => null });
    return {
        useModuleCopy: () => copy,
        useActiveModuleCopy: copy,
        useModuleCopyResolver: () => (_eventType: unknown, moduleKey: string) => copy(moduleKey),
    };
});
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('@/hooks/useGiftAccount', () => ({
    useGiftAccount: () => ({ data: null }),
}));

vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => mocks.activeEvent,
    useActiveMember: () => mocks.activeMember,
    useIsHost: () => mocks.isHost,
    useContentAccessMode: () => mocks.accessMode,
    useRouteEventId: () => 'event-1',
}));

function event(overrides: Record<string, unknown> = {}) {
    return {
        id: 'event-1',
        status: 'ACTIVE',
        deletedAt: null,
        modules: ['rsvp', 'gallery', 'wishbook', 'wishlist'].map((moduleKey) => ({
            moduleKey,
            isEnabled: true,
            isAvailable: true,
            configuration: moduleKey === 'gallery' ? { qrUploadEnabled: true } : {},
        })),
        ...overrides,
    };
}

// The backend closes every module (isAvailable: false) the moment an event is
// deleted, while isEnabled still reflects what the host had turned on.
function deletedEvent() {
    return event({
        deletedAt: '2026-09-22T10:00:00Z',
        modules: ['rsvp', 'gallery', 'wishbook', 'wishlist'].map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: false })),
    });
}

describe('useToolsMenuItems', () => {
    beforeEach(() => {
        mocks.isHost = true;
        mocks.accessMode = 'standard';
        mocks.activeMember = { id: 'm1', isFeatured: false };
    });

    it('lists every available tool for a live event', () => {
        mocks.activeEvent = event();
        const { result } = renderHook(() => useToolsMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['rsvp', 'schedule', 'gallery', 'wishbook', 'gifts']);
    });

    it('keeps only gallery and wishbook for a deleted event', () => {
        mocks.activeEvent = deletedEvent();
        const { result } = renderHook(() => useToolsMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['gallery', 'wishbook']);
    });

    const withRoles = (overrides: Record<string, unknown> = {}) =>
        event({
            modules: [{ moduleKey: 'member_roles', isEnabled: true, isAvailable: true, configuration: {} }],
            ...overrides,
        });

    it('hides My role for a demo visitor', () => {
        mocks.activeEvent = withRoles();
        mocks.accessMode = 'demoVisitor';
        const { result } = renderHook(() => useToolsMenuItems());
        expect(result.current.some((tool) => tool.key === 'myRole')).toBe(false);
    });

    it('adds My role when the member can set a role', () => {
        mocks.activeEvent = withRoles();
        const { result } = renderHook(() => useToolsMenuItems());
        const item = result.current.find((tool) => tool.key === 'myRole');
        expect(item?.href).toBe('/events/event-1/feed?sheet=role');
    });

    it('hides My role for featured members and draft events', () => {
        mocks.activeEvent = withRoles();
        mocks.activeMember = { id: 'm1', isFeatured: true };
        expect(renderHook(() => useToolsMenuItems()).result.current.map((tool) => tool.key)).not.toContain('myRole');

        mocks.activeMember = { id: 'm1', isFeatured: false };
        mocks.activeEvent = withRoles({ status: 'DRAFT' });
        expect(renderHook(() => useToolsMenuItems()).result.current.map((tool) => tool.key)).not.toContain('myRole');
    });
});

describe('suspended StoryWall', () => {
    it('shows no tools and no host menu', () => {
        mocks.activeEvent = event({ suspended: true });
        expect(renderHook(() => useToolsMenuItems()).result.current).toEqual([]);
        expect(renderHook(() => useHostMenuItems()).result.current).toEqual([]);
    });
});

describe('useHostMenuItems', () => {
    it('keeps only manage for a deleted event', () => {
        mocks.activeEvent = deletedEvent();
        const { result } = renderHook(() => useHostMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['manage']);
    });

    it('still lists manage, both QR pages and help for a live event', () => {
        mocks.activeEvent = event();
        const { result } = renderHook(() => useHostMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['manage', 'galleryQr', 'invitationsQr', 'help']);
    });

    // A missing qrUploadEnabled key counts as off: the backend mints no upload link.
    it('hides the gallery QR page when the gallery config has no qrUploadEnabled', () => {
        mocks.activeEvent = event({
            modules: [{ moduleKey: 'gallery', isEnabled: true, isAvailable: true, configuration: {} }],
        });
        const { result } = renderHook(() => useHostMenuItems());
        expect(result.current.map((item) => item.key)).not.toContain('galleryQr');
    });
});
