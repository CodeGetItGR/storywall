import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStoryModal } from '@/hooks/useStoryModal';
import type { MediaResponseDto, StoryResponseDto } from '@/lib/api/types';

const useMediaItem = vi.fn();
let story: StoryResponseDto | undefined;
vi.mock('@/hooks', () => ({
    useStory: () => ({ data: story, error: null }),
    useEventStories: () => ({ data: story ? [story] : [] }),
    useMediaItem: (id: string | null) => useMediaItem(id),
    useMarkStoryViewed: () => ({ mutate: vi.fn() }),
    useDeleteStory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useOverlayHistory', () => ({ useOverlayHistory: () => ({ requestClose: vi.fn() }) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'event-1', status: 'ACTIVE' }),
    useActiveMember: () => null,
    useIsHost: () => false,
}));

const MEDIA = { id: 'media-1', mediaType: 'IMAGE', mediaUrl: 'https://r2.test/media-1.jpg' } as MediaResponseDto;
const FETCHED = { ...MEDIA, mediaUrl: 'https://r2.test/fetched.jpg' } as MediaResponseDto;

function storyWith(media: MediaResponseDto | null): StoryResponseDto {
    return {
        id: 'story-1',
        eventId: 'event-1',
        authorMemberId: 'member-1',
        author: null,
        mediaId: 'media-1',
        media,
        caption: null,
        songUrl: null,
        expiresAt: '2026-10-01T12:00:00Z',
        createdAt: '2026-09-30T12:00:00Z',
        deletedAt: null,
        viewedByCurrentUser: false,
    };
}

beforeEach(() => {
    useMediaItem.mockReset();
    useMediaItem.mockReturnValue({ data: FETCHED });
});

describe('useStoryModal media', () => {
    it('shows the media the story carries, without requesting it', () => {
        story = storyWith(MEDIA);

        const { result } = renderHook(() => useStoryModal({ open: true, storyId: 'story-1', onCloseAction: vi.fn() }));

        expect(result.current.media).toBe(MEDIA);
        expect(useMediaItem).not.toHaveBeenCalledWith('media-1');
    });

    it('requests the media when the story comes without it', () => {
        story = storyWith(null);

        const { result } = renderHook(() => useStoryModal({ open: true, storyId: 'story-1', onCloseAction: vi.fn() }));

        expect(useMediaItem).toHaveBeenCalledWith('media-1');
        expect(result.current.media).toBe(FETCHED);
    });
});
