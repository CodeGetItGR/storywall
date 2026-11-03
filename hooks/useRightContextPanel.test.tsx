import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRightContextPanel } from '@/hooks/useRightContextPanel';
import { capabilitiesOf } from '@/lib/__fixtures__/eventCapabilities';

const mocks = vi.hoisted(() => ({ activeEvent: null as Record<string, unknown> | null }));

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
vi.mock('@/hooks/useToolsMenuItems', () => ({ useHostMenuItems: () => [], useToolsMenuItems: () => [] }));
vi.mock('@/hooks/useUsage', () => ({ useEventUsage: () => ({ data: null }) }));
vi.mock('@/hooks/useWishbook', () => ({ useWishbook: () => ({ data: undefined }) }));

const galleryWithQr = { moduleKey: 'gallery', isEnabled: true, isAvailable: true, configuration: { qrUploadEnabled: true } };

function event(modules: { moduleKey: string; isEnabled: boolean; isAvailable: boolean }[]) {
    return { id: 'e1', status: 'ACTIVE', deletedAt: null, modules, capabilities: capabilitiesOf(modules) };
}

describe('useRightContextPanel links', () => {
    beforeEach(() => {
        mocks.activeEvent = null;
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
