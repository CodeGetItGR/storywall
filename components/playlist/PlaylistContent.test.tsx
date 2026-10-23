import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlaylistContent } from '@/components/playlist/PlaylistContent';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/components/tools/ModulePageShell', () => ({
    ModulePageShell: ({ action, children }: { action?: React.ReactNode; children: React.ReactNode }) => (
        <div>
            {action}
            {children}
        </div>
    ),
}));
vi.mock('@/hooks/useModuleCopy', () => ({ useActiveModuleCopy: () => ({ name: 'Playlist' }) }));
vi.mock('@/components/playlist/PlaylistItemRow', () => ({ PlaylistItemRow: () => null }));

const BASE = { canSuggest: true, eventId: 'e1', isEventWritable: true, onSuggest: vi.fn(), suggestions: [], suggestionsLoading: false };

afterEach(cleanup);

describe('PlaylistContent live list link', () => {
    it('links hosts and DJs to the live list', () => {
        render(<PlaylistContent {...BASE} showLiveLink />);
        expect(screen.getByRole('link', { name: 'Vendors.live.open' }).getAttribute('href')).toBe('/events/e1/tools/playlist/live');
    });

    it('has no link for guests', () => {
        render(<PlaylistContent {...BASE} showLiveLink={false} />);
        expect(screen.queryByRole('link', { name: 'Vendors.live.open' })).toBeNull();
    });

    it('has no link by default', () => {
        render(<PlaylistContent {...BASE} />);
        expect(screen.queryByRole('link', { name: 'Vendors.live.open' })).toBeNull();
    });
});
