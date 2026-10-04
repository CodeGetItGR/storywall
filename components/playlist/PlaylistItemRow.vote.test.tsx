import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlaylistItemRow } from '@/components/playlist/PlaylistItemRow';
import type { PlaylistSuggestionResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    deleteVote: vi.fn(),
    refetchVotes: vi.fn(),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/usePlaylist', () => ({
    usePlaylistVotes: () => ({ refetch: mocks.refetchVotes }),
    useCreatePlaylistVote: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useDeletePlaylistVote: () => ({ isPending: false, mutateAsync: mocks.deleteVote }),
    useDeletePlaylistSuggestion: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks', () => ({ useAppConfig: () => ({ data: { reportTargetTypes: [] } }) }));
vi.mock('@/hooks/useContentAccess', () => ({ useContentAccess: () => ({ isDemoBuilder: true, isLocked: () => false }) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'event-1', status: 'ACTIVE' }),
    useActiveMember: () => ({ id: 'admin' }),
    useIsHost: () => true,
}));
// An admin acting as a demo guest.
vi.mock('@/hooks/usePostingAsMember', () => ({
    usePostingAsMember: () => ({ member: { id: 'guest' }, isPersona: true }),
}));

const suggestion: PlaylistSuggestionResponseDto = {
    id: 'sug-1',
    eventId: 'event-1',
    authorMemberId: 'admin',
    title: 'Song',
    artist: 'Artist',
    youtubeUrl: null,
    spotifyUrl: null,
    comment: null,
    upvoteCount: 2,
    downvoteCount: 0,
    myVote: 'UPVOTE',
    createdAt: '2026-09-30T12:00:00Z',
    deletedAt: null,
};

afterEach(cleanup);

describe('PlaylistItemRow vote under act-as', () => {
    it("removes the chosen guest's vote, not the admin's", async () => {
        mocks.refetchVotes.mockResolvedValue({
            data: [
                { id: 'vote-admin', memberId: 'admin', voteType: 'UPVOTE' },
                { id: 'vote-guest', memberId: 'guest', voteType: 'UPVOTE' },
            ],
        });

        render(<PlaylistItemRow suggestion={suggestion} />);
        fireEvent.click(screen.getByRole('button', { name: 'removeVote' }));

        await waitFor(() => expect(mocks.deleteVote).toHaveBeenCalledWith('vote-guest'));
    });
});
