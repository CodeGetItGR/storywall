import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlaylistItemRow } from '@/components/playlist/PlaylistItemRow';
import type { PlaylistSuggestionResponseDto } from '@/lib/api/types';

let activeMemberId: string | null = 'm1';
let reportTargetTypes: string[] = ['PLAYLIST_SUGGESTION'];
let eventStatus = 'ACTIVE';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/usePlaylist', () => ({
    usePlaylistVotes: () => ({ refetch: vi.fn() }),
    useCreatePlaylistVote: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useDeletePlaylistVote: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useDeletePlaylistSuggestion: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks', () => ({
    useAppConfig: () => ({ data: { reportTargetTypes } }),
}));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'event-1', status: eventStatus }),
    useActiveMember: () => (activeMemberId ? { id: activeMemberId } : null),
    useIsHost: () => false,
}));
vi.mock('@/components/reports', () => ({
    ReportTargetModal: ({ open, targetType, targetId }: { open: boolean; targetType: string; targetId: string }) =>
        open ? <div data-testid="report-modal" data-target-type={targetType} data-target-id={targetId} /> : null,
}));

function suggestion(authorMemberId: string | null): PlaylistSuggestionResponseDto {
    return {
        id: 'sug-1',
        eventId: 'event-1',
        authorMemberId,
        title: 'Song',
        artist: 'Artist',
        youtubeUrl: null,
        spotifyUrl: null,
        comment: null,
        upvoteCount: 0,
        downvoteCount: 0,
        myVote: null,
        createdAt: '2026-09-30T12:00:00Z',
        deletedAt: null,
    };
}

afterEach(cleanup);

beforeEach(() => {
    activeMemberId = 'm1';
    reportTargetTypes = ['PLAYLIST_SUGGESTION'];
    eventStatus = 'ACTIVE';
});

describe('PlaylistItemRow report', () => {
    it("lets a member report another member's suggestion", async () => {
        render(<PlaylistItemRow suggestion={suggestion('m2')} />);

        fireEvent.click(screen.getByRole('button', { name: 'moreOptions' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'report' }));

        const modal = await screen.findByTestId('report-modal');
        expect(modal.dataset.targetType).toBe('PLAYLIST_SUGGESTION');
        expect(modal.dataset.targetId).toBe('sug-1');
    });

    it('lets a member report an authorless suggestion', async () => {
        render(<PlaylistItemRow suggestion={suggestion(null)} />);

        fireEvent.click(screen.getByRole('button', { name: 'moreOptions' }));
        expect(await screen.findByRole('menuitem', { name: 'report' })).toBeTruthy();
    });

    it('offers no report on your own suggestion', async () => {
        render(<PlaylistItemRow suggestion={suggestion('m1')} />);

        // own suggestion still has delete: wait for the portal menu to open, then report must be absent
        fireEvent.click(screen.getByRole('button', { name: 'moreOptions' }));
        expect(await screen.findByRole('menuitem', { name: 'deleteSuggestion' })).toBeTruthy();
        expect(screen.queryByRole('menuitem', { name: 'report' })).toBeNull();
    });

    it('offers no report when /api/config does not list the type', () => {
        reportTargetTypes = [];
        render(<PlaylistItemRow suggestion={suggestion('m2')} />);

        expect(screen.queryByRole('button', { name: 'moreOptions' })).toBeNull();
    });

    it('offers no report to non-members or on a read-only event', () => {
        activeMemberId = null;
        const { unmount } = render(<PlaylistItemRow suggestion={suggestion('m2')} />);
        expect(screen.queryByRole('button', { name: 'moreOptions' })).toBeNull();
        unmount();

        activeMemberId = 'm1';
        eventStatus = 'ENDED';
        render(<PlaylistItemRow suggestion={suggestion('m2')} />);
        expect(screen.queryByRole('button', { name: 'moreOptions' })).toBeNull();
    });
});
