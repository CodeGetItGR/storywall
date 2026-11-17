import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SaveMyDateFontPairingsPage from '@/app/(main)/(admin)/admin/save-my-date/font-pairings/page';
import SaveMyDateFontsPage from '@/app/(main)/(admin)/admin/save-my-date/fonts/page';
import SaveMyDateTextsPage from '@/app/(main)/(admin)/admin/save-my-date/texts/page';

const server = vi.hoisted(() => ({ token: 'token' as string | null, get: vi.fn() }));
vi.mock('@/lib/auth/serverEventContext', () => ({ prefetchAccessToken: async () => server.token }));
vi.mock('@/lib/api/serverFetch', () => ({ serverGet: server.get }));
vi.mock('@/components/admin/saveMyDate/fonts/SaveMyDateFontsPanel', () => ({ SaveMyDateFontsPanel: () => null }));
vi.mock('@/components/admin/saveMyDate/fontPairings/FontPairingsPanel', () => ({ FontPairingsPanel: () => null }));
vi.mock('@/components/admin/saveMyDate/texts/InvitationTextsPanel', () => ({ InvitationTextsPanel: () => null }));

// The query keys the page seeded, as the client hooks will look them up.
async function seededKeys(page: () => Promise<ReactElement>): Promise<unknown[]> {
    const element = (await page()) as ReactElement<{ state: DehydratedState }>;
    return element.props.state.queries.map((query) => query.queryKey);
}

beforeEach(() => {
    server.token = 'token';
    server.get.mockReset();
    server.get.mockResolvedValue([]);
});

describe('Save my date admin pages', () => {
    it("prefetches Save my date's fonts, not the wall's, and the event type names", async () => {
        expect(await seededKeys(SaveMyDateFontsPage)).toEqual([
            ['admin', 'theme-fonts', 'INVITATION'],
            ['admin', 'platform-event-types'],
        ]);
        expect(server.get).toHaveBeenCalledWith('/api/admin/theme-fonts?library=INVITATION', 'token');
    });

    it('prefetches the font pairings and the event type names', async () => {
        expect(await seededKeys(SaveMyDateFontPairingsPage)).toEqual([
            ['admin', 'invitation-font-pairings', 'list'],
            ['admin', 'platform-event-types'],
        ]);
    });

    it('prefetches the texts and the event type names', async () => {
        expect(await seededKeys(SaveMyDateTextsPage)).toEqual([
            ['admin', 'invitation-texts', 'list'],
            ['admin', 'platform-event-types'],
        ]);
    });

    it('renders with an empty cache when signed out or when Spring fails', async () => {
        server.token = null;
        expect(await seededKeys(SaveMyDateTextsPage)).toEqual([]);
        server.token = 'token';
        server.get.mockRejectedValue(new Error('down'));
        expect(await seededKeys(SaveMyDateFontPairingsPage)).toEqual([]);
        expect(server.get).toHaveBeenCalled();
    });
});
