import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHostMenuItems, useToolsMenuItems } from '@/hooks/useToolsMenuItems';

const mocks = vi.hoisted(() => ({
    activeEvent: null as Record<string, unknown> | null,
    activeMember: { id: 'm1', isFeatured: false } as Record<string, unknown> | null,
    isHost: true,
    accessMode: 'standard',
}));

const vendor = vi.hoisted(() => ({ me: null as Record<string, unknown> | null, list: [] as unknown[], meEventId: undefined as string | null | undefined }));
vi.mock('@/hooks/useVendors', () => ({
    useMyVendorRole: (eventId: string | null) => {
        vendor.meEventId = eventId;
        return { data: vendor.me };
    },
    useEventVendors: () => ({ data: vendor.list }),
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
        vendor.me = null;
        vendor.list = [];
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

    const withHeOrShe = () => event({ modules: [{ moduleKey: 'he_or_she', isEnabled: true, isAvailable: true, configuration: {} }] });

    it('lists Boy or Girl? when its module is readable', () => {
        mocks.activeEvent = withHeOrShe();
        const item = renderHook(() => useToolsMenuItems()).result.current.find((tool) => tool.key === 'heOrShe');
        expect(item?.href).toBe('/events/event-1/tools/he-or-she');
    });

    it('leaves Boy or Girl? out without the module, and for a demo visitor', () => {
        mocks.activeEvent = event();
        expect(renderHook(() => useToolsMenuItems()).result.current.map((tool) => tool.key)).not.toContain('heOrShe');

        mocks.activeEvent = withHeOrShe();
        mocks.accessMode = 'demoVisitor';
        expect(renderHook(() => useToolsMenuItems()).result.current.map((tool) => tool.key)).not.toContain('heOrShe');
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

    it('hides My role for a vendor', () => {
        mocks.activeEvent = withRoles();
        vendor.me = role('PHOTOGRAPHER', ['PRO_ALBUM']);
        expect(renderHook(() => useToolsMenuItems()).result.current.map((tool) => tool.key)).not.toContain('myRole');
    });

    it('hides My role for featured members and draft events', () => {
        mocks.activeEvent = withRoles();
        mocks.activeMember = { id: 'm1', isFeatured: true };
        expect(renderHook(() => useToolsMenuItems()).result.current.map((tool) => tool.key)).not.toContain('myRole');

        mocks.activeMember = { id: 'm1', isFeatured: false };
        mocks.activeEvent = withRoles({ status: 'DRAFT' });
        expect(renderHook(() => useToolsMenuItems()).result.current.map((tool) => tool.key)).not.toContain('myRole');
    });

    const withMemberArchive = () =>
        event({ modules: [{ moduleKey: 'gallery', isEnabled: true, isAvailable: true, configuration: { memberArchiveAfterEnd: true } }] });

    it('lists the gallery for a guest when members get the download', () => {
        mocks.isHost = false;
        mocks.activeEvent = withMemberArchive();
        const item = renderHook(() => useToolsMenuItems()).result.current.find((tool) => tool.key === 'gallery');
        expect(item?.href).toBe('/events/event-1/tools/gallery');
    });

    it('leaves the gallery out for a guest otherwise', () => {
        mocks.isHost = false;
        mocks.activeEvent = event();
        expect(renderHook(() => useToolsMenuItems()).result.current.map((tool) => tool.key)).not.toContain('gallery');
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

    it('lists manage, both QR pages, announcement and help for a live event', () => {
        mocks.activeEvent = event();
        const { result } = renderHook(() => useHostMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['manage', 'galleryQr', 'invitationsQr', 'announcement', 'help']);
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

function vendorEvent() {
    const base = event();
    const extra = ['vendors', 'playlist'].map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true, configuration: {} }));
    return { ...base, modules: [...(base.modules as object[]), ...extra] };
}

function withoutModule(moduleKey: string) {
    const base = vendorEvent();
    return { ...base, modules: (base.modules as { moduleKey: string }[]).filter((module) => module.moduleKey !== moduleKey) };
}

function role(type: string, capabilities: string[], accessOpen = true) {
    return {
        vendorId: 'v1',
        vendorType: type,
        capabilities,
        accessEndsAt: null,
        accessOpen,
        profileComplete: true,
        showPartnerPrompt: false,
        proStorageBytes: null,
        proUsedBytes: null,
        optedOut: false,
        hiddenByHost: false,
    };
}

describe('vendor tools in the menu', () => {
    beforeEach(() => {
        vendor.me = null;
        vendor.list = [];
        vendor.meEventId = undefined;
        mocks.isHost = false;
        mocks.accessMode = 'standard';
        mocks.activeMember = { id: 'm1', isFeatured: false };
        mocks.activeEvent = vendorEvent();
    });

    const keysNow = () => renderHook(() => useToolsMenuItems()).result.current.map((item) => item.key);

    it('gives a planner their page, announcement, RSVP report and share links', () => {
        vendor.me = role('PLANNER', ['ANNOUNCE', 'QR_READ', 'RSVP_REPORT', 'SCHEDULE_EDIT']);
        const keys = keysNow();
        expect(keys).toEqual(expect.arrayContaining(['vendorMe', 'announcement', 'rsvpReport', 'vendorQr']));
        expect(keys).not.toContain('liveRequests');
    });

    it('opens the planner RSVP report from the vendor page', () => {
        vendor.me = role('PLANNER', ['RSVP_REPORT']);
        const item = renderHook(() => useToolsMenuItems()).result.current.find((tool) => tool.key === 'rsvpReport');
        expect(item?.href).toBe('/events/event-1/manage/rsvp/reports/FULL_LIST?from=vendor');
    });

    it('gives a DJ their page and live requests only', () => {
        vendor.me = role('MUSIC', ['SONG_REQUESTS']);
        const keys = keysNow();
        expect(keys).toEqual(expect.arrayContaining(['vendorMe', 'liveRequests']));
        expect(keys).not.toContain('announcement');
        expect(keys).not.toContain('vendorQr');
    });

    it('gives a photographer and a venue only their page', () => {
        for (const me of [role('PHOTOGRAPHER', ['PRO_ALBUM']), role('VENUE', [])]) {
            vendor.me = me;
            const keys = keysNow();
            expect(keys).toContain('vendorMe');
            expect(keys.filter((key) => ['announcement', 'rsvpReport', 'vendorQr', 'liveRequests'].includes(key))).toEqual([]);
        }
    });

    it('keeps only the vendor page after the access window', () => {
        // The backend sends no capabilities once the window is closed.
        vendor.me = role('PLANNER', [], false);
        expect(keysNow()).toContain('vendorMe');
        expect(keysNow()).not.toContain('announcement');
        // Even a stale capability list does not open a tool outside the window.
        vendor.me = role('PLANNER', ['ANNOUNCE', 'QR_READ', 'RSVP_REPORT', 'SCHEDULE_EDIT'], false);
        expect(keysNow()).not.toContain('announcement');
    });

    it('shows a guest no vendor tools', () => {
        expect(keysNow()).not.toContain('vendorMe');
    });

    it('does not ask a host for a vendor role', () => {
        mocks.isHost = true;
        renderHook(() => useToolsMenuItems());
        expect(vendor.meEventId).toBeNull();
        mocks.isHost = false;
        renderHook(() => useToolsMenuItems());
        expect(vendor.meEventId).toBe('event-1');
    });

    it('shows the vendor list once one vendor is listed', () => {
        expect(keysNow()).not.toContain('vendors');
        vendor.list = [{ id: 'v1', businessName: 'Studio X', hiddenByHost: true, optedOut: false }];
        expect(keysNow()).not.toContain('vendors');
        vendor.list = [{ id: 'v1', businessName: 'Studio X', hiddenByHost: false, optedOut: false }];
        expect(keysNow()).toContain('vendors');
    });

    it('keeps the vendor page and drops the tools while the module is off', () => {
        mocks.activeEvent = event();
        // The backend sends no capabilities while the tools are off.
        vendor.me = role('MUSIC', []);
        vendor.list = [{ id: 'v1', businessName: 'Studio X', hiddenByHost: false, optedOut: false }];
        const keys = keysNow();
        expect(keys).toContain('vendorMe');
        expect(keys).not.toContain('vendors');
        expect(keys).not.toContain('liveRequests');
    });

    it('leaves the RSVP report out when the RSVP module is off', () => {
        vendor.me = role('PLANNER', ['ANNOUNCE', 'QR_READ', 'RSVP_REPORT', 'SCHEDULE_EDIT']);
        mocks.activeEvent = withoutModule('rsvp');
        const keys = keysNow();
        expect(keys).not.toContain('rsvpReport');
        expect(keys).toContain('announcement');
    });

    it('leaves live requests out when the playlist module is off', () => {
        vendor.me = role('MUSIC', ['SONG_REQUESTS']);
        mocks.activeEvent = withoutModule('playlist');
        expect(keysNow()).not.toContain('liveRequests');
    });
});

describe('vendor entries in the host menu', () => {
    beforeEach(() => {
        mocks.isHost = true;
    });

    it('adds Vendors and Announcement for a live event with the module', () => {
        mocks.activeEvent = vendorEvent();
        const keys = renderHook(() => useHostMenuItems()).result.current.map((item) => item.key);
        expect(keys).toEqual(expect.arrayContaining(['vendors', 'announcement']));
    });

    it('has no Vendors entry without the module, and neither entry on a draft', () => {
        mocks.activeEvent = event();
        expect(renderHook(() => useHostMenuItems()).result.current.map((item) => item.key)).not.toContain('vendors');
        mocks.activeEvent = { ...vendorEvent(), status: 'DRAFT' };
        const draftKeys = renderHook(() => useHostMenuItems()).result.current.map((item) => item.key);
        expect(draftKeys).not.toContain('vendors');
        expect(draftKeys).not.toContain('announcement');
    });
});
