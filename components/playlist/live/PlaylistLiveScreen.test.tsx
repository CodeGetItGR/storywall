import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlaylistLiveScreen } from '@/components/playlist/live/PlaylistLiveScreen';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/components/tools/ModulePageShell', () => ({
    ModulePageShell: ({ action, children }: { action?: React.ReactNode; children: React.ReactNode }) => (
        <div>
            {action}
            {children}
        </div>
    ),
}));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: false }) }));
const live = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/components/tools/ModuleUnavailableState', () => ({ ModuleUnavailableState: ({ title }: { title: string }) => <p>{title}</p> }));
vi.mock('@/hooks/usePlaylistLive', () => ({ usePlaylistLive: () => live.value }));

const ONE = {
    id: 's1',
    title: 'One',
    artist: 'A',
    rank: 1,
    upvoteCount: 3,
    downvoteCount: 0,
    playedAt: null,
    comment: 'For Maria',
    spotifyUrl: 'https://open.spotify.com/track/1',
    youtubeUrl: null,
};
const TWO = {
    id: 's2',
    title: 'Two',
    artist: null,
    rank: 2,
    upvoteCount: 1,
    downvoteCount: 0,
    playedAt: '2027-07-12T21:00:00Z',
    comment: null,
    spotifyUrl: null,
    youtubeUrl: 'https://youtu.be/x',
};

beforeEach(() => {
    live.value = {
        isReadable: true,
        rows: [ONE, TWO],
        upNext: [ONE],
        played: [TWO],
        playedOpen: false,
        togglePlayedOpen: vi.fn(),
        isLoading: false,
        error: null,
        canMark: true,
        pendingId: null,
        togglePlayed: vi.fn(),
    };
});
afterEach(cleanup);

describe('PlaylistLiveScreen', () => {
    it('shows the songs to play as cards, with their links, and marks one played', () => {
        render(<PlaylistLiveScreen />);
        const card = screen.getAllByRole('listitem')[0];
        expect(card.textContent).toContain('One');
        expect(card.textContent).toContain('For Maria');
        expect(screen.getByRole('link', { name: 'openSpotify' }).getAttribute('href')).toBe('https://open.spotify.com/track/1');
        fireEvent.click(screen.getByRole('button', { name: 'live.markPlayed:{"title":"One"}' }));
        expect(live.value.togglePlayed).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
        expect(screen.queryByText('live.notLive')).toBeNull();
    });

    it('folds the played songs away until opened', () => {
        render(<PlaylistLiveScreen />);
        const toggle = screen.getByRole('button', { name: 'live.playedGroup:{"count":1}' });
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('Two')).toBeNull();
        fireEvent.click(toggle);
        expect(live.value.togglePlayedOpen).toHaveBeenCalled();

        cleanup();
        live.value = { ...live.value, playedOpen: true };
        render(<PlaylistLiveScreen />);
        expect(screen.getByText('Two')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'openYouTube' }).getAttribute('href')).toBe('https://youtu.be/x');
        expect(screen.getByRole('button', { name: 'live.markUnplayed:{"title":"Two"}' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('says so when every request was played', () => {
        live.value = { ...live.value, upNext: [] };
        render(<PlaylistLiveScreen />);
        expect(screen.getByText('live.allPlayed')).toBeTruthy();
    });

    it('keeps the list but takes the mark controls away when the event is not live', () => {
        live.value = { ...live.value, canMark: false };
        render(<PlaylistLiveScreen />);
        expect(screen.getByText('live.notLive')).toBeTruthy();
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
        expect(screen.queryByRole('button', { name: /live\.mark/ })).toBeNull();
    });

    it('shows the unavailable state, not the list, when the playlist module is off', () => {
        live.value = { ...live.value, isReadable: false, rows: [], upNext: [], played: [], canMark: false };
        render(<PlaylistLiveScreen />);
        expect(screen.getByText('disabledTitle')).toBeTruthy();
        expect(screen.queryByText('live.notLive')).toBeNull();
        expect(screen.queryByText('live.empty')).toBeNull();
    });

    it('shows the error from a failed mark', () => {
        live.value = { ...live.value, error: 'failed' };
        render(<PlaylistLiveScreen />);
        expect(screen.getByRole('alert').textContent).toBe('failed');
    });

    it('shows the empty line', () => {
        live.value = { ...live.value, rows: [], upNext: [], played: [] };
        render(<PlaylistLiveScreen />);
        expect(screen.getByText('live.empty')).toBeTruthy();
    });
});
