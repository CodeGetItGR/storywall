import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StoryModal } from '@/components/story/StoryModal';
import type { AuthorDto, StoryResponseDto } from '@/lib/api/types';

let author: AuthorDto | null;
let canReportStory = true;

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useMemberAvatarUrl', () => ({ useMemberAvatarUrl: () => () => null }));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({
    ConfirmActionModal: ({ layer }: { layer?: string }) => <div data-testid="confirm-modal" data-layer={layer} />,
}));
vi.mock('@/components/story/StoryVideo', () => ({ StoryVideo: () => null }));
vi.mock('@/components/reports', () => ({
    ReportTargetModal: ({
        open,
        layer,
        eventId,
        targetType,
        targetId,
    }: {
        open: boolean;
        layer?: string;
        eventId: string;
        targetType: string;
        targetId: string;
    }) =>
        open ? (
            <div data-testid="report-modal" data-layer={layer} data-event-id={eventId} data-target-type={targetType} data-target-id={targetId} />
        ) : null,
}));
vi.mock('@/hooks/useStoryModal', () => ({
    useStoryModal: () => {
        const activeStory = {
            id: 'story-1',
            eventId: 'event-1',
            authorMemberId: 'm2',
            author,
            createdAt: '2026-09-30T12:00:00Z',
            caption: null,
        } as StoryResponseDto;
        const noop = vi.fn();
        return {
            onOpenChange: noop,
            currentStoryId: 'story-1',
            storyNotFound: false,
            activeStory,
            group: { authorMemberId: 'm2', stories: [activeStory] },
            storyIndex: 0,
            media: undefined,
            author,
            progress: 0,
            showMenu: false,
            showDeleteConfirm: false,
            canManage: false,
            canDeleteStory: false,
            canReportStory,
            reportOpen: true,
            isVideoStory: false,
            isDeleting: false,
            mediaError: false,
            goNext: noop,
            goPrev: noop,
            handleCloseStory: noop,
            handleToggleMenu: noop,
            handleDeleteRequest: noop,
            handleCloseDeleteConfirm: noop,
            handleDelete: noop,
            handleReportRequest: noop,
            handleCloseReport: noop,
            handleMediaLoaded: noop,
            handleMediaError: noop,
            handleVideoTimeUpdate: noop,
            handleVideoEnded: noop,
        };
    },
}));

afterEach(cleanup);

beforeEach(() => {
    author = { memberId: 'm2', displayName: 'Alice', nickname: null, role: 'ATTENDEE', avatarUrl: null } as AuthorDto;
    canReportStory = true;
});

describe('StoryModal report dialog', () => {
    it('reports the story with its id', async () => {
        render(<StoryModal open storyId="story-1" onCloseAction={vi.fn()} />);

        const modal = await screen.findByTestId('report-modal');
        expect(modal.dataset.layer).toBe('overStory');
        expect(modal.dataset.eventId).toBe('event-1');
        expect(modal.dataset.targetType).toBe('STORY');
        expect(modal.dataset.targetId).toBe('story-1');
    });

    it('lifts the delete confirm above the story viewer too', async () => {
        render(<StoryModal open storyId="story-1" onCloseAction={vi.fn()} />);

        const confirm = await screen.findByTestId('confirm-modal');
        expect(confirm.dataset.layer).toBe('overStory');
    });

    it('renders no report dialog when the viewer cannot report', async () => {
        canReportStory = false;
        render(<StoryModal open storyId="story-1" onCloseAction={vi.fn()} />);

        // wait for the portal to mount, then assert absence
        expect(await screen.findByRole('button', { name: 'closeStory' })).toBeTruthy();
        expect(screen.queryByTestId('report-modal')).toBeNull();
    });
});
