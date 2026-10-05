import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlaylistItemRow } from '@/components/playlist/PlaylistItemRow';
import type { EventStatus, PlaylistSuggestionResponseDto } from '@/lib/api/types';

const activeMemberId: string | null = 'm1';
const reportTargetTypes: string[] = [];
const eventStatus: EventStatus = 'ACTIVE';

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
vi.mock('@/hooks/useContentAccess', () => ({ useContentAccess: () => ({ isDemoBuilder: false, isLocked: () => false }) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'event-1', status: eventStatus }),
    useActiveMember: () => (activeMemberId ? { id: activeMemberId } : null),
    useIsHost: () => false,
}));
vi.mock('@/hooks/usePostingAsMember', () => ({
    usePostingAsMember: () => ({ member: activeMemberId ? { id: activeMemberId } : null, isPersona: false }),
}));
vi.mock('@/components/reports', () => ({
    ReportTargetModal: ({ open, targetType, targetId }: { open: boolean; targetType: string; targetId: string }) =>
        open ? <div data-testid="report-modal" data-target-type={targetType} data-target-id={targetId} /> : null,
}));

function suggestion(links: Pick<PlaylistSuggestionResponseDto, 'spotifyUrl' | 'youtubeUrl'>): PlaylistSuggestionResponseDto {
    return {
        id: 'sug-1',
        eventId: 'event-1',
        authorMemberId: 'm2',
        title: 'Song',
        artist: 'Artist',
        ...links,
        comment: null,
        upvoteCount: 0,
        downvoteCount: 0,
        myVote: null,
        createdAt: '2026-09-30T12:00:00Z',
        deletedAt: null,
    };
}

afterEach(cleanup);

// Cookie Policy §7: nothing loads from Spotify or YouTube until the viewer asks for it.
describe('PlaylistItemRow preview', () => {
    it('loads the Spotify player only after "show preview" is clicked', () => {
        const { container } = render(
            <PlaylistItemRow suggestion={suggestion({ spotifyUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', youtubeUrl: null })} />,
        );

        expect(container.querySelector('iframe')).toBeNull();
        expect(screen.getByText('previewConsentSpotify')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'showPreview' }));

        expect(container.querySelector('iframe')?.getAttribute('src')).toContain('open.spotify.com/embed');
    });

    it('names YouTube for a YouTube-only suggestion, and still links out without loading it', () => {
        const { container } = render(
            <PlaylistItemRow suggestion={suggestion({ spotifyUrl: null, youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })} />,
        );

        expect(container.querySelector('iframe')).toBeNull();
        expect(screen.getByText('previewConsentYouTube')).toBeTruthy();
        expect(container.querySelector('a[href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"]')).toBeTruthy();
    });
});
