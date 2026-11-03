import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useLiteHome } from '@/hooks/useLiteHome';
import type { EventDetailResponseDto, EventModuleResponseDto, QrLinkResponseDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({
    event: null as Partial<EventDetailResponseDto> | null,
    isHost: true,
    isPrimaryHost: true,
    qrLinks: [] as Partial<QrLinkResponseDto>[],
}));

vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => state.event,
    useIsHost: () => state.isHost,
}));
vi.mock('@/hooks/useQrLinks', () => ({
    useEventQrLinks: (eventId: string | null) => ({ data: eventId ? state.qrLinks : undefined }),
}));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({
    usePlanUpgradeHref: (eventId: string) => (state.isPrimaryHost ? `/events/${eventId}/manage?tab=plan` : null),
}));

afterEach(() => {
    state.event = null;
    state.isHost = true;
    state.isPrimaryHost = true;
    state.qrLinks = [];
});

function module_(moduleKey: string, isEnabled: boolean) {
    return { moduleKey, isEnabled, isAvailable: isEnabled } as EventModuleResponseDto;
}

function event_(modules: EventModuleResponseDto[]): Partial<EventDetailResponseDto> {
    return { id: 'e1', title: 'Anna & Nick', status: 'ACTIVE', deletedAt: null, suspended: false, modules };
}

const guestCode = { id: 'q1', targetType: 'GUEST', status: 'ACTIVE', publicUrl: 'https://storywall.gr/q/abc' } as Partial<QrLinkResponseDto>;
const bundle = event_([module_('posts', false), module_('gallery', true), module_('wishbook', true)]);
const galleryOnly = event_([module_('posts', false), module_('gallery', true)]);
const wishbookOnly = event_([module_('posts', false), module_('wishbook', true)]);
const onDownload = () => undefined;

describe('useLiteHome', () => {
    it('is not a home on a full event', () => {
        state.event = event_([module_('posts', true), module_('gallery', true)]);
        const { result } = renderHook(() => useLiteHome('gallery', { onDownload }));
        expect(result.current.isHome).toBe(false);
    });

    it("shows a Bundle's tabs and every quick action on the gallery", () => {
        state.event = bundle;
        state.qrLinks = [guestCode];
        const { result } = renderHook(() => useLiteHome('gallery', { onDownload }));
        if (!result.current.isHome) throw new Error('expected a home');
        expect(result.current.tabs).toEqual({
            active: 'gallery',
            hrefs: { gallery: '/events/e1/tools/gallery', wishbook: '/events/e1/tools/wishbook' },
        });
        expect(result.current.actions).toEqual(['qr', 'share', 'download', 'upgrade']);
    });

    it('has no tabs on a Wishbook event', () => {
        state.event = wishbookOnly;
        const { result } = renderHook(() => useLiteHome('wishbook', { onDownload }));
        if (!result.current.isHome) throw new Error('expected a home');
        expect(result.current.tabs).toBeNull();
    });

    it('hides the QR code and share link until the guest code exists', () => {
        state.event = galleryOnly;
        const { result } = renderHook(() => useLiteHome('gallery', { onDownload }));
        if (!result.current.isHome) throw new Error('expected a home');
        expect(result.current.actions).toEqual(['download', 'upgrade']);
    });

    it('hides the upgrade from a co-host', () => {
        state.event = galleryOnly;
        state.qrLinks = [guestCode];
        state.isPrimaryHost = false;
        const { result } = renderHook(() => useLiteHome('gallery', { onDownload }));
        if (!result.current.isHome) throw new Error('expected a home');
        expect(result.current.actions).toEqual(['qr', 'share', 'download']);
    });

    it('hides the download while there is nothing to download', () => {
        state.event = galleryOnly;
        state.qrLinks = [guestCode];
        const { result } = renderHook(() => useLiteHome('gallery'));
        if (!result.current.isHome) throw new Error('expected a home');
        expect(result.current.actions).toEqual(['qr', 'share', 'upgrade']);
    });

    it("makes a Bundle's wishbook a home too, with its tab active", () => {
        state.event = bundle;
        const { result } = renderHook(() => useLiteHome('wishbook', { onDownload }));
        if (!result.current.isHome) throw new Error('expected a home');
        expect(result.current.tabs?.active).toBe('wishbook');
    });
});
