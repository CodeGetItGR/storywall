import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FontPairingsPanel } from '@/components/admin/saveMyDate/fontPairings/FontPairingsPanel';
import type { AdminFontPairingDto } from '@/lib/adminFontPairings';
import messages from '@/messages/en.json';

// The whole screen against a stubbed backend: list, create and change.
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

const copy = messages.AdminPage.saveMyDate.fontPairings;
const drawerCopy = messages.AdminPage.invitationThemes.drawer;
const orderCopy = messages.AdminPage.order;

const PAIRING: AdminFontPairingDto = {
    id: 'p1',
    name: 'Classic',
    titleFont: "'Playfair Display',serif",
    bodyFont: 'Lora,serif',
    buttonFont: null,
    hidden: true,
    sortOrder: 0,
    eventTypes: [],
};
const SECOND: AdminFontPairingDto = { ...PAIRING, id: 'p2', name: 'Modern', hidden: false, sortOrder: 1 };
let pairings: AdminFontPairingDto[];
const UPLOADED = [
    { id: 'f1', key: 'theos', familyName: 'Theos', fallback: 'serif', library: 'INVITATION', archived: false, url: '/api/theme-fonts/theos/1.woff2', presetCount: 0, invitationEventTypes: [] },
];

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages}>
                <FontPairingsPanel />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    pairings = [PAIRING];
    api.get.mockImplementation(async (path: string) => {
        if (path === '/api/admin/invitation-typography-presets') return pairings;
        if (path === '/api/admin/platform-event-types') return [{ eventTypeKey: 'WEDDING', name: { el: 'Γάμος', en: 'Wedding' } }];
        if (path === '/api/admin/theme-fonts?library=INVITATION') return UPLOADED;
        if (path === '/api/invitation-fonts/files') return [];
        throw new Error(`unexpected ${path}`);
    });
    api.post.mockImplementation(async (_path: string, input: object) => ({ ...PAIRING, ...input, id: 'p2' }));
    api.patch.mockImplementation(async (_path: string, input: object) => ({ ...PAIRING, ...input }));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('FontPairingsPanel', () => {
    it('lists each pairing with its fonts, event types and status', async () => {
        renderPanel();
        const row = (await screen.findByRole('button', { name: 'Classic' })).closest('tr') as HTMLElement;
        expect(within(row).getByText('Playfair Display')).toBeInTheDocument();
        expect(within(row).getByText('Lora')).toBeInTheDocument();
        expect(within(row).getByText(copy.sameAsText)).toBeInTheDocument();
        expect(within(row).getByText(messages.AdminPage.saveMyDate.eventTypesAll)).toBeInTheDocument();
        expect(within(row).getByText(messages.AdminPage.invitationThemes.status.HIDDEN)).toBeInTheDocument();
    });

    it("creates a pairing that uses one of Save my date's uploaded fonts, last in the list", async () => {
        renderPanel();
        await screen.findByRole('button', { name: 'Classic' });
        fireEvent.click(screen.getByRole('button', { name: copy.create }));

        const drawer = await screen.findByRole('dialog');
        fireEvent.change(within(drawer).getByRole('textbox', { name: new RegExp(`^${drawerCopy.name}`) }), { target: { value: 'Modern' } });
        const titleSelect = await within(drawer).findByRole('combobox', { name: new RegExp(`^${copy.fonts.title}`) });
        await within(titleSelect).findByRole('option', { name: 'Theos' });
        fireEvent.change(titleSelect, { target: { value: "'Theos',serif" } });
        fireEvent.click(within(drawer).getByRole('checkbox', { name: 'Wedding' }));
        fireEvent.click(within(drawer).getByRole('button', { name: drawerCopy.save }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/api/admin/invitation-typography-presets', {
                name: 'Modern',
                titleFont: "'Theos',serif",
                bodyFont: 'Georgia,serif',
                buttonFont: '',
                hidden: false,
                sortOrder: 1,
                eventTypes: ['WEDDING'],
            }),
        );
    });

    it('holds a save with no name and says why', async () => {
        renderPanel();
        await screen.findByRole('button', { name: 'Classic' });
        fireEvent.click(screen.getByRole('button', { name: copy.create }));
        const drawer = await screen.findByRole('dialog');
        fireEvent.click(within(drawer).getByRole('button', { name: drawerCopy.save }));

        expect(await within(drawer).findByText(messages.AdminPage.saveMyDate.checks.upTo100)).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('moves a pairing with its arrows, saving the places that changed', async () => {
        pairings = [PAIRING, SECOND];
        renderPanel();
        await screen.findByRole('button', { name: 'Modern' });
        expect(screen.getByRole('button', { name: orderCopy.moveUp.replace('{name}', 'Classic') })).toBeDisabled();
        expect(screen.getByRole('button', { name: orderCopy.moveDown.replace('{name}', 'Modern') })).toBeDisabled();
        expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: orderCopy.moveDown.replace('{name}', 'Classic') }));

        await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
        expect(api.patch).toHaveBeenCalledWith('/api/admin/invitation-typography-presets/p1', { sortOrder: 1 });
        expect(api.patch).toHaveBeenCalledWith('/api/admin/invitation-typography-presets/p2', { sortOrder: 0 });
    });

    it('shows a pairing again', async () => {
        renderPanel();
        fireEvent.click(await screen.findByRole('button', { name: 'Classic' }));
        const drawer = await screen.findByRole('dialog');
        fireEvent.click(within(drawer).getByRole('button', { name: copy.shown }));
        fireEvent.click(within(drawer).getByRole('button', { name: drawerCopy.save }));

        await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/admin/invitation-typography-presets/p1', { hidden: false }));
    });
});
