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
vi.mock('@/hooks/usePlaylistLive', () => ({ usePlaylistLive: () => live.value }));

beforeEach(() => {
    live.value = {
        rows: [
            { id: 's1', title: 'One', artist: 'A', rank: 1, upvoteCount: 3, downvoteCount: 0, playedAt: null, comment: 'For Maria' },
            { id: 's2', title: 'Two', artist: null, rank: 2, upvoteCount: 1, downvoteCount: 0, playedAt: '2027-07-12T21:00:00Z' },
        ],
        isLoading: false,
        error: null,
        canMark: true,
        pendingId: null,
        togglePlayed: vi.fn(),
    };
});
afterEach(cleanup);

describe('PlaylistLiveScreen', () => {
    it('lists songs by rank and marks one played', () => {
        render(<PlaylistLiveScreen />);
        const rows = screen.getAllByRole('listitem');
        expect(rows[0].textContent).toContain('One');
        expect(rows[0].textContent).toContain('For Maria');
        expect(rows[1].textContent).toContain('Two');
        expect(rows[1].textContent).toContain('live.played');
        fireEvent.click(screen.getByRole('button', { name: 'live.markPlayed:{"title":"One"}' }));
        expect(live.value.togglePlayed).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
        expect(screen.getByRole('button', { name: 'live.markUnplayed:{"title":"Two"}' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.queryByText('live.notLive')).toBeNull();
    });

    it('keeps the list but takes the mark controls away when the event is not live', () => {
        live.value = { ...live.value, canMark: false };
        render(<PlaylistLiveScreen />);
        expect(screen.getByText('live.notLive')).toBeTruthy();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(screen.queryByRole('button', { name: /live\.mark/ })).toBeNull();
    });

    it('shows the error from a failed mark', () => {
        live.value = { ...live.value, error: 'failed' };
        render(<PlaylistLiveScreen />);
        expect(screen.getByRole('alert').textContent).toBe('failed');
    });

    it('shows the empty line', () => {
        live.value = { ...live.value, rows: [] };
        render(<PlaylistLiveScreen />);
        expect(screen.getByText('live.empty')).toBeTruthy();
    });
});
