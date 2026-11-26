import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedGalleryBlock } from '@/hooks/useFeedGalleryBlock';
import type { EventDetailResponseDto, EventModuleResponseDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({ isHost: false, member: { id: 'm1' } as object | null }));
const calls = vi.hoisted(() => ({ media: [] as (string | null)[] }));

vi.mock('@/providers/EventProvider', () => ({ useIsHost: () => state.isHost, useActiveMember: () => state.member }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => () => ({ name: 'Photos' }) }));
vi.mock('@/hooks/useUploadAccept', () => ({ useUploadAccept: () => ({ media: 'image/*,video/*' }) }));
vi.mock('@/hooks/useFeedGalleryUpload', () => ({ useFeedGalleryUpload: () => ({ onFiles: () => undefined, uploading: false, notice: null }) }));
vi.mock('@/hooks/useMedia', () => ({
    useEventMedia: (eventId: string | null) => {
        calls.media.push(eventId);
        const content = ['a', 'b', 'c', 'd'].map((id) => ({ id, mediaType: 'IMAGE', status: 'READY', mediaUrl: `https://cdn/${id}.jpg` }));
        return { data: { pages: [{ content, page: { totalElements: 24 } }] }, isLoading: false };
    },
}));

function event({ archive = false, status = 'ACTIVE' }: { archive?: boolean; status?: 'ACTIVE' | 'DRAFT' } = {}) {
    const gallery = {
        moduleKey: 'gallery',
        isAvailable: true,
        configuration: { memberArchiveAfterEnd: archive },
    } as unknown as EventModuleResponseDto;
    return { id: 'e1', eventType: 'WEDDING', status, deletedAt: null, modules: [gallery] } as unknown as EventDetailResponseDto;
}

beforeEach(() => {
    state.isHost = false;
    state.member = { id: 'm1' };
    calls.media = [];
});

describe('useFeedGalleryBlock', () => {
    it('gives the three newest items and how many more', () => {
        const { result } = renderHook(() => useFeedGalleryBlock(event(), true));
        expect(result.current.tiles.map((tile) => tile.id)).toEqual(['a', 'b', 'c']);
        expect(result.current.more).toBe(21);
    });

    it('links the photos for a host, and for guests only where the gallery page is open to them', () => {
        state.isHost = true;
        expect(renderHook(() => useFeedGalleryBlock(event(), true)).result.current.photosHref).toBe('/events/e1/tools/gallery');
        state.isHost = false;
        expect(renderHook(() => useFeedGalleryBlock(event(), true)).result.current.photosHref).toBeNull();
        expect(renderHook(() => useFeedGalleryBlock(event({ archive: true }), true)).result.current.photosHref).toBe('/events/e1/tools/gallery');
    });

    it('lets a member upload on a live event, and tells them about the download where guests get it', () => {
        const { result } = renderHook(() => useFeedGalleryBlock(event({ archive: true }), true));
        expect(result.current.upload).not.toBeNull();
        expect(result.current.archiveNote).toBe(true);
        expect(renderHook(() => useFeedGalleryBlock(event(), true)).result.current.archiveNote).toBe(false);
    });

    it('has no upload on a draft event', () => {
        expect(renderHook(() => useFeedGalleryBlock(event({ status: 'DRAFT' }), true)).result.current.upload).toBeNull();
    });

    it('reads nothing and uploads nothing once the module is gone', () => {
        const { result } = renderHook(() => useFeedGalleryBlock(event(), false));
        expect(calls.media.at(-1)).toBeNull();
        expect(result.current.upload).toBeNull();
        expect(result.current.photosHref).toBeNull();
    });
});
