import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRightContextPanel } from '@/hooks/useRightContextPanel';
import { capabilitiesOf } from '@/lib/__fixtures__/eventCapabilities';

const mocks = vi.hoisted(() => ({
    activeEvent: null as Record<string, unknown> | null,
    hostItems: [] as { key: string }[],
    toolItems: [] as { key: string }[],
}));

vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => mocks.activeEvent,
    useEventContextLoading: () => false,
    useIsHost: () => true,
}));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useBilling', () => ({ useUpgradeOptions: () => ({ data: [] }) }));
vi.mock('@/hooks/useGalleryArchive', () => ({ useGallerySummary: () => ({ data: null }) }));
vi.mock('@/hooks/useIsPrimaryHost', () => ({ useIsPrimaryHost: () => true }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (moduleKey: string) => ({ name: moduleKey, description: '' }) }));
vi.mock('@/hooks/useQrLinks', () => ({ useEventQrLinks: () => ({ data: [] }) }));
vi.mock('@/hooks/useToolsMenuItems', () => ({ useHostMenuItems: () => mocks.hostItems, useToolsMenuItems: () => mocks.toolItems }));
vi.mock('@/hooks/useUsage', () => ({ useEventUsage: () => ({ data: null }) }));
vi.mock('@/hooks/useWishbook', () => ({ useWishbook: () => ({ data: undefined }) }));

const galleryWithQr = { moduleKey: 'gallery', isEnabled: true, isAvailable: true, configuration: { qrUploadEnabled: true } };

function event(modules: { moduleKey: string; isEnabled: boolean; isAvailable: boolean }[]) {
    return { id: 'e1', status: 'ACTIVE', deletedAt: null, modules, capabilities: capabilitiesOf(modules) };
}

describe('useRightContextPanel links', () => {
    beforeEach(() => {
        mocks.activeEvent = null;
        mocks.hostItems = [];
        mocks.toolItems = [];
    });

    it('shows the upload and share links on a full event', () => {
        mocks.activeEvent = event([{ moduleKey: 'posts', isEnabled: true, isAvailable: true }, galleryWithQr]);
        const { result } = renderHook(() => useRightContextPanel());
        expect(result.current.showInvitationsQr).toBe(true);
        expect(result.current.showGalleryQr).toBe(true);
    });

    it('hides them on a lite event, whose one guest code sits in the home quick actions', () => {
        mocks.activeEvent = event([galleryWithQr]);
        const { result } = renderHook(() => useRightContextPanel());
        expect(result.current.showInvitationsQr).toBe(false);
        expect(result.current.showGalleryQr).toBe(false);
    });
});

describe('useRightContextPanel beside a lite home', () => {
    const wishbook = { moduleKey: 'wishbook', isEnabled: true, isAvailable: true };

    beforeEach(() => {
        mocks.activeEvent = event([galleryWithQr, wishbook]);
        mocks.hostItems = [{ key: 'manage' }, { key: 'help' }];
        mocks.toolItems = [{ key: 'gallery' }, { key: 'wishbook' }];
    });

    it('keeps to manage and help, without the tools or the counts the home already shows', () => {
        const { result } = renderHook(() => useRightContextPanel({ liteHome: true }));
        expect(result.current.actionItems.map((item) => item.key)).toEqual(['manage', 'help']);
        expect(result.current.showMediaSummary).toBe(false);
        expect(result.current.showWishbookSummary).toBe(false);
        expect(result.current.showGalleryQr).toBe(false);
        expect(result.current.showInvitationsQr).toBe(false);
    });

    it('leaves the panel on the manage overview as it was', () => {
        const { result } = renderHook(() => useRightContextPanel());
        expect(result.current.actionItems.map((item) => item.key)).toEqual(['manage', 'help', 'gallery', 'wishbook']);
        expect(result.current.showMediaSummary).toBe(true);
        expect(result.current.showWishbookSummary).toBe(true);
    });
});
