import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvitationThemeDrawer } from '@/components/admin/saveMyDate/themes/InvitationThemeDrawer';
import { type AdminInvitationThemeDto, BLANK_THEME_DESIGN, blankThemeDocument } from '@/lib/adminInvitationThemes';
import { ApiError } from '@/lib/api/client';
import messages from '@/messages/en.json';

const server = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: server.get, put: server.put, post: server.post },
}));

const THEME: AdminInvitationThemeDto = {
    id: 't1',
    eventType: 'WEDDING',
    status: 'DRAFT',
    name: 'Gamos 001',
    slug: 'gamos-001',
    code: null,
    description: null,
    cardColor: null,
    seoTitle: null,
    seoDescription: null,
    ogImageAssetId: null,
    cardThumbAssetId: null,
    productPhotos: [],
    sortOrder: 2,
    design: BLANK_THEME_DESIGN as unknown as Record<string, unknown>,
    document: blankThemeDocument('WEDDING', 'gamos-001') as unknown as Record<string, unknown>,
    revision: 3,
    assets: [],
    updatedAt: '2026-11-01T10:00:00Z',
};

const EVENT_TYPES = [
    { key: 'WEDDING', label: 'Wedding' },
    { key: 'BAPTISM', label: 'Baptism' },
];

function renderDrawer(overrides: { onDuplicateAction?: () => void; onPreviewAction?: () => void } = {}) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const props = { onCloseAction: vi.fn(), onDuplicateAction: vi.fn(), onPreviewAction: vi.fn(), ...overrides };
    render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="en" messages={messages}>
                <InvitationThemeDrawer themeId="t1" title="Gamos 001" eventTypes={EVENT_TYPES} {...props} />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
    return props;
}

beforeEach(() => {
    server.get.mockResolvedValue(THEME);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('InvitationThemeDrawer', () => {
    it('renames a theme, its slug following, and saves every field with the loaded revision', async () => {
        server.put.mockImplementation((_path: string, input: Record<string, unknown>) => Promise.resolve({ ...THEME, ...input, revision: 4 }));
        renderDrawer();

        const name = await screen.findByLabelText(/^Name/);
        fireEvent.change(name, { target: { value: 'Gamos 002' } });
        expect(screen.getByLabelText(/^Slug/)).toHaveValue('gamos-002');
        fireEvent.click(screen.getByRole('button', { name: 'Live' }));
        expect(screen.getByText('In the catalogue. Hosts can start from it.')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/^Meta description/), { target: { value: 'Hello' } });
        expect(screen.getByText('5/320')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(server.put).toHaveBeenCalledTimes(1));
        expect(server.put).toHaveBeenCalledWith(
            '/api/admin/invitation-themes/t1',
            expect.objectContaining({ name: 'Gamos 002', slug: 'gamos-002', status: 'ACTIVE', seoDescription: 'Hello', revision: 3, sortOrder: 2 }),
        );
        // Saved: nothing left to save, and the copy can be made now.
        await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled());
        expect(screen.getByRole('button', { name: 'Duplicate' })).toHaveAttribute('aria-disabled', 'false');
    });

    it('keeps a slug the admin chose when the name changes', async () => {
        renderDrawer();
        fireEvent.change(await screen.findByLabelText(/^Slug/), { target: { value: 'chosen' } });
        fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Other' } });
        expect(screen.getByLabelText(/^Slug/)).toHaveValue('chosen');
    });

    it('refuses a bad slug before saving', async () => {
        renderDrawer();
        fireEvent.change(await screen.findByLabelText(/^Slug/), { target: { value: 'Bad Slug' } });
        expect(screen.getByText('Use lower-case letters, digits and hyphens.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(server.put).not.toHaveBeenCalled();
    });

    it('says when the slug is taken, or the theme was saved elsewhere', async () => {
        server.put.mockRejectedValueOnce(new ApiError(409, { errorCode: 5200 }));
        renderDrawer();
        fireEvent.change(await screen.findByLabelText(/^Slug/), { target: { value: 'taken' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(await screen.findByText('Another theme uses this slug.')).toBeInTheDocument();

        server.put.mockRejectedValueOnce(new ApiError(409, { errorCode: 5201 }));
        fireEvent.change(screen.getByLabelText(/^Slug/), { target: { value: 'free' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(await screen.findByText('This theme was saved elsewhere. Close and reopen it.')).toBeInTheDocument();
    });

    it('asks for a save before a copy, and previews the saved theme', async () => {
        const props = renderDrawer();
        fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Changed' } });
        const duplicate = screen.getByRole('button', { name: 'Duplicate' });
        expect(duplicate).toHaveAttribute('title', 'Save first');
        fireEvent.click(duplicate);
        expect(props.onDuplicateAction).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
        expect(props.onPreviewAction).toHaveBeenCalledWith('t1');
    });

    it('duplicates an unchanged theme', async () => {
        const props = renderDrawer();
        fireEvent.click(await screen.findByRole('button', { name: 'Duplicate' }));
        expect(props.onDuplicateAction).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    });
});
