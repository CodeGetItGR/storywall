import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvitationTextsPanel } from '@/components/admin/saveMyDate/texts/InvitationTextsPanel';
import type { AdminInvitationTextDto } from '@/lib/adminInvitationTexts';
import messages from '@/messages/en.json';

// The whole screen against a stubbed backend: list, create, change and delete.
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));

const copy = messages.AdminPage.saveMyDate.texts;
const drawerCopy = messages.AdminPage.invitationThemes.drawer;

const EVENT_TYPES = [
    { eventTypeKey: 'WEDDING', name: { el: 'Γάμος', en: 'Wedding' } },
    { eventTypeKey: 'BAPTISM', name: { el: 'Βάπτιση', en: 'Baptism' } },
];
const TEXT: AdminInvitationTextDto = {
    id: 't1',
    eventType: 'BAPTISM',
    language: 'el',
    label: 'Formal',
    body: 'Με χαρά σας προσκαλούμε\nστη βάπτιση',
    sortOrder: 0,
};

let texts: AdminInvitationTextDto[];

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages}>
                <InvitationTextsPanel />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    texts = [TEXT];
    api.get.mockImplementation(async (path: string) => {
        if (path === '/api/admin/invitation-texts') return texts;
        if (path === '/api/admin/platform-event-types') return EVENT_TYPES;
        throw new Error(`unexpected ${path}`);
    });
    api.post.mockImplementation(async (_path: string, input: Omit<AdminInvitationTextDto, 'id'>) => {
        const created = { ...input, id: 't2' } as AdminInvitationTextDto;
        texts = [...texts, created];
        return created;
    });
    api.patch.mockReset();
    api.del.mockImplementation(async () => {
        texts = [];
    });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('InvitationTextsPanel', () => {
    it('lists each text with its event type and language', async () => {
        renderPanel();
        const row = (await screen.findByRole('button', { name: 'Formal' })).closest('tr');
        expect(row).not.toBeNull();
        expect(within(row as HTMLElement).getByText('Baptism')).toBeInTheDocument();
        expect(within(row as HTMLElement).getByText('Greek')).toBeInTheDocument();
    });

    it('creates a text from the drawer', async () => {
        renderPanel();
        await screen.findByRole('button', { name: 'Formal' });
        fireEvent.click(screen.getByRole('button', { name: copy.create }));

        const drawer = await screen.findByRole('dialog');
        fireEvent.change(within(drawer).getByRole('textbox', { name: new RegExp(`^${copy.label}`) }), { target: { value: 'Casual' } });
        fireEvent.change(within(drawer).getByRole('textbox', { name: new RegExp(`^${copy.body}`) }), { target: { value: 'Ελάτε!' } });
        fireEvent.click(within(drawer).getByRole('button', { name: drawerCopy.save }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/api/admin/invitation-texts', {
                eventType: 'WEDDING',
                language: 'el',
                label: 'Casual',
                body: 'Ελάτε!',
                sortOrder: 0,
            }),
        );
        expect(await screen.findByRole('button', { name: 'Casual' })).toBeInTheDocument();
    });

    it('asks before deleting, then removes the text', async () => {
        renderPanel();
        fireEvent.click(await screen.findByRole('button', { name: 'Formal' }));
        const drawer = await screen.findByRole('dialog');
        fireEvent.click(within(drawer).getByRole('button', { name: copy.delete }));

        expect(await screen.findByText(copy.deleteTitle)).toBeInTheDocument();
        expect(api.del).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: copy.deleteConfirm }));

        await waitFor(() => expect(api.del).toHaveBeenCalledWith('/api/admin/invitation-texts/t1'));
        expect(await screen.findByText(copy.empty)).toBeInTheDocument();
    });
});
