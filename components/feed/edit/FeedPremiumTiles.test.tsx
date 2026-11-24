import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedPremiumTiles } from '@/components/feed/edit/FeedPremiumTiles';
import type { PremiumTile } from '@/lib/feedModuleTiles';
import { routes } from '@/lib/routes';
import en from '@/messages/en.json';

// The app config isn't read here: the names come from the messages.
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));

afterEach(cleanup);

function renderTiles(tiles: PremiumTile[]) {
    const on = { onAdd: vi.fn() };
    render(
        <QueryClientProvider client={new QueryClient()}>
            <NextIntlClientProvider locale="en" messages={en}>
                <FeedPremiumTiles tiles={tiles} eventId="e1" eventType="WEDDING" {...on} />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
    return on;
}

describe('FeedPremiumTiles', () => {
    const tiles: PremiumTile[] = [
        { module: 'rsvp', action: 'add' },
        { module: 'wishbook', action: 'buy', addonCode: 'ADD_WB' },
        { module: 'playlist', action: 'add' },
        { module: 'he_or_she', action: 'add' },
        { module: 'quiz_polls', action: 'add' },
    ];

    it('shows four, and the arrow shows the rest', () => {
        renderTiles(tiles);
        expect(screen.getAllByRole('listitem')).toHaveLength(4);
        fireEvent.click(screen.getByRole('button', { name: en.FeedEditor.premiumMore }));
        expect(screen.getAllByRole('listitem')).toHaveLength(5);
        expect(screen.getByRole('button', { name: en.FeedEditor.premiumLess })).toBeTruthy();
    });

    it('adds a module the event has', () => {
        const on = renderTiles(tiles);
        fireEvent.click(screen.getByRole('button', { name: en.Modules.playlist.name }));
        expect(on.onAdd).toHaveBeenCalledWith('playlist');
    });

    it("links a module the plan sells to its add-on's purchase", () => {
        renderTiles(tiles);
        expect(screen.getByRole('link', { name: en.Modules.wishbook.name }).getAttribute('href')).toBe(routes.events.settingsAddons('e1', { add: 'ADD_WB' }));
    });

    it('has no arrow with four tiles or fewer', () => {
        renderTiles(tiles.slice(0, 4));
        expect(screen.queryByRole('button', { name: en.FeedEditor.premiumMore })).toBeNull();
    });
});
