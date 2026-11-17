import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationThemeNameModal } from '@/components/admin/saveMyDate/themes/InvitationThemeNameModal';
import type { InvitationThemeNameModalState } from '@/hooks/useInvitationThemesCatalog';
import type { AdminInvitationThemeSummaryDto } from '@/lib/adminInvitationThemes';
import messages from '@/messages/en.json';

const server = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post: server.post },
}));

const EXISTING: AdminInvitationThemeSummaryDto = {
    id: 't1',
    eventType: 'BAPTISM',
    status: 'ACTIVE',
    name: 'Stars',
    slug: 'stars',
    code: null,
    sortOrder: 4,
    revision: 1,
    cardThumbUrl: null,
    updatedAt: '2026-11-01T10:00:00Z',
};

function renderModal(state: NonNullable<InvitationThemeNameModalState>) {
    const queryClient = new QueryClient();
    const props = { onCloseAction: vi.fn(), onNamedAction: vi.fn() };
    render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="en" messages={messages}>
                <InvitationThemeNameModal
                    state={state}
                    themes={[EXISTING]}
                    eventTypes={[
                        { key: 'WEDDING', label: 'Wedding' },
                        { key: 'BAPTISM', label: 'Baptism' },
                    ]}
                    {...props}
                />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
    return props;
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('InvitationThemeNameModal', () => {
    it('creates a draft with a free slug, last among its event type, then opens it', async () => {
        const created = { id: 'new' };
        server.post.mockResolvedValue(created);
        const props = renderModal({ mode: 'create' });

        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        expect(screen.getByText('Enter 1 to 120 characters.')).toBeInTheDocument();
        expect(server.post).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Stars' } });
        fireEvent.change(screen.getByLabelText(/^Event type/), { target: { value: 'BAPTISM' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        await waitFor(() => expect(props.onNamedAction).toHaveBeenCalledWith(created));
        expect(server.post).toHaveBeenCalledWith(
            '/api/admin/invitation-themes',
            expect.objectContaining({ name: 'Stars', slug: 'stars-2', eventType: 'BAPTISM', status: 'DRAFT' }),
        );
        // The backend puts a new theme last among its event type.
        expect(server.post.mock.calls[0][1]).not.toHaveProperty('sortOrder');
    });

    it('duplicates under a new name, without asking for an event type', async () => {
        const copy = { id: 'copy' };
        server.post.mockResolvedValue(copy);
        const props = renderModal({ mode: 'duplicate', sourceId: 't1', sourceName: 'Stars' });

        expect(screen.queryByLabelText(/^Event type/)).not.toBeInTheDocument();
        expect(screen.getByLabelText(/^Name/)).toHaveValue('Stars');
        fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Stars blue' } });
        fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

        await waitFor(() => expect(props.onNamedAction).toHaveBeenCalledWith(copy));
        expect(server.post).toHaveBeenCalledWith('/api/admin/invitation-themes/t1/duplicate', { name: 'Stars blue', slug: 'stars-blue' });
    });
});
