import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStoryModal } from '@/hooks/useStoryModal';
import type { MediaResponseDto, StoryResponseDto } from '@/lib/api/types';

let story: StoryResponseDto;
let activeMemberId: string | null = 'm1';
let reportTargetTypes: string[] = ['STORY'];
let eventStatus = 'ACTIVE';

vi.mock('@/hooks', () => ({
    useStory: () => ({ data: story, error: null }),
    useEventStories: () => ({ data: [story] }),
    useMediaItem: () => ({ data: undefined }),
    useMarkStoryViewed: () => ({ mutate: vi.fn() }),
    useDeleteStory: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useAppConfig: () => ({ data: { reportTargetTypes } }),
}));
vi.mock('@/hooks/useOverlayHistory', () => ({ useOverlayHistory: () => ({ requestClose: vi.fn() }) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'event-1', status: eventStatus }),
    useActiveMember: () => (activeMemberId ? { id: activeMemberId } : null),
    useIsHost: () => false,
}));

const MEDIA = { id: 'media-1', mediaType: 'IMAGE', mediaUrl: 'https://r2.test/media-1.jpg' } as MediaResponseDto;

function storyBy(authorMemberId: string | null): StoryResponseDto {
    return {
        id: 'story-1',
        eventId: 'event-1',
        authorMemberId,
        author: null,
        mediaId: 'media-1',
        media: MEDIA,
        caption: null,
        songUrl: null,
        expiresAt: '2026-10-01T12:00:00Z',
        createdAt: '2026-09-30T12:00:00Z',
        deletedAt: null,
        viewedByCurrentUser: false,
    };
}

function mount() {
    return renderHook(() => useStoryModal({ open: true, storyId: 'story-1', onCloseAction: vi.fn() }));
}

beforeEach(() => {
    activeMemberId = 'm1';
    reportTargetTypes = ['STORY'];
    eventStatus = 'ACTIVE';
    story = storyBy('m2');
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useStoryModal canReportStory', () => {
    it('is true for another member story and for an authorless one', () => {
        expect(mount().result.current.canReportStory).toBe(true);

        story = storyBy(null);
        expect(mount().result.current.canReportStory).toBe(true);
    });

    it('is false for your own story', () => {
        story = storyBy('m1');
        expect(mount().result.current.canReportStory).toBe(false);
    });

    it('is false for non-members, read-only events, and when config omits STORY', () => {
        activeMemberId = null;
        expect(mount().result.current.canReportStory).toBe(false);

        activeMemberId = 'm1';
        eventStatus = 'ENDED';
        expect(mount().result.current.canReportStory).toBe(false);

        eventStatus = 'ACTIVE';
        reportTargetTypes = [];
        expect(mount().result.current.canReportStory).toBe(false);
    });

    it('does nothing when the viewer cannot report', () => {
        story = storyBy('m1');
        const { result } = mount();

        act(() => result.current.handleReportRequest());

        expect(result.current.reportOpen).toBe(false);
    });
});

describe('useStoryModal report dialog and the story timer', () => {
    it('holds the progress while the report dialog is open and resumes it after', () => {
        vi.useFakeTimers();
        const { result } = mount();
        act(() => result.current.handleMediaLoaded());

        act(() => {
            vi.advanceTimersByTime(300);
        });
        const before = result.current.progress;
        expect(before).toBeGreaterThan(0);

        act(() => result.current.handleReportRequest());
        expect(result.current.reportOpen).toBe(true);
        act(() => {
            vi.advanceTimersByTime(3000);
        });
        expect(result.current.progress).toBe(before);

        act(() => result.current.handleCloseReport());
        expect(result.current.reportOpen).toBe(false);
        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(result.current.progress).toBeGreaterThan(before);
    });

    it('closes the options menu when the report dialog opens', () => {
        const { result } = mount();
        act(() => result.current.handleToggleMenu());
        expect(result.current.showMenu).toBe(true);

        act(() => result.current.handleReportRequest());

        expect(result.current.showMenu).toBe(false);
    });
});
