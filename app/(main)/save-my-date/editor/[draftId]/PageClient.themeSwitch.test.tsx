import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDraftServer, TEST_API } from '@/hooks/invitationDraftTestServer';
import { testAuth, WithAuth } from '@/hooks/testAuthContext';
import { EDITOR_TOUR_SEEN_KEY } from '@/lib/invitation/editorTour';
import en from '@/messages/en.json';

import InvitationEditorPage from './PageClient';

// Hoisted above the imports, so the API client reads it when it loads. Same as TEST_API.
vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
});

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/save-my-date/editor/draft-1' }));
vi.mock('@/lib/inAppHistory', () => ({ hasInAppPrevious: () => true }));
// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        disconnect() {}
    },
);
// A computer-wide screen: the theme panel docks beside the canvas.
vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
}));

// The whole suite runs at once, so the editor can be slow to answer.
const SLOW = { timeout: 5000 };
const backend = createDraftServer();
// Signed out, Publish saves and then asks to sign in, so it stands in for saving.
const SIGNED_OUT = testAuth({ user: null });

async function openEditor() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <QueryClientProvider client={queryClient}>
                <WithAuth value={SIGNED_OUT}>
                    <InvitationEditorPage draftId="draft-1" />
                </WithAuth>
            </QueryClientProvider>
        </NextIntlClientProvider>,
    );
    await screen.findByText('Design: Olive', {}, SLOW);
}

async function save() {
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    const title = await screen.findByText('Sign in to publish', {}, SLOW);
    fireEvent.click(within(title.closest<HTMLElement>('[role="dialog"]')!).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Sign in to publish')).not.toBeInTheDocument());
}

async function chooseLinen() {
    fireEvent.click(screen.getByRole('button', { name: 'Change design' }));
    fireEvent.click(await screen.findByRole('button', { name: /Linen/ }, SLOW));
    const title = await screen.findByText('Switch to Linen?', {}, SLOW);
    return title.closest<HTMLElement>('[role="dialog"]')!;
}

function storedSection(id: string) {
    return backend.stored().document.sections.find((item) => item.id === id)!;
}

describe('Invitation editor: changing the design', { timeout: 20_000 }, () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    beforeEach(() => localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1'));
    afterEach(() => {
        cleanup();
        backend.server.resetHandlers();
        backend.reset();
    });
    afterAll(() => backend.server.close());

    it('lists the designs for the event type with the current one marked', async () => {
        await openEditor();
        fireEvent.click(screen.getByRole('button', { name: 'Change design' }));

        const current = await screen.findByRole('button', { name: /Olive/ }, SLOW);
        expect(current).toHaveAttribute('aria-current', 'true');
        expect(current).toBeDisabled();
        expect(within(current).getByText('Current')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Linen/ })).toBeEnabled();
    });

    it("says which of the host's sections the new design doesn't have before switching", async () => {
        await openEditor();
        const dialog = await chooseLinen();

        expect(within(dialog).getByText('Your texts, photos and dates stay. Only the design changes. You can undo this.')).toBeInTheDocument();
        expect(within(dialog).getByText("This design doesn't have these sections. They'll be hidden, not deleted:")).toBeInTheDocument();
        expect(within(dialog).getByText('Gift list / IBAN')).toBeInTheDocument();
        expect(within(dialog).getByText('FAQ')).toBeInTheDocument();
    });

    it('Cancel goes back to the designs and changes nothing', async () => {
        await openEditor();
        const dialog = await chooseLinen();

        fireEvent.click(within(dialog).getByText('Cancel'));

        expect(await screen.findByRole('button', { name: /Linen/ }, SLOW)).toBeInTheDocument();
        expect(screen.getByText('Design: Olive')).toBeInTheDocument();
        expect(backend.saves).toHaveLength(0);
    });

    it('switches, saves the new design with the content, and undo switches back', async () => {
        await openEditor();
        const dialog = await chooseLinen();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Change design' }));

        expect(await screen.findByText('Design: Linen', {}, SLOW)).toBeInTheDocument();
        await save();
        expect(backend.saves.at(-1)?.themeSlug).toBe('linen');
        expect(backend.stored()).toMatchObject({ themeSlug: 'linen', document: { themeId: 'linen' } });
        expect(storedSection('s-gift')).toMatchObject({ visible: false, hiddenByTheme: true });
        expect(storedSection('s-invitation').data).toEqual(backend.saves[0].document.sections.find((item) => item.id === 's-invitation')!.data);

        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(screen.getByText('Design: Olive')).toBeInTheDocument();
        await save();
        expect(backend.saves.at(-1)?.themeSlug).toBe('olive');
        expect(backend.stored()).toMatchObject({ themeSlug: 'olive', document: { themeId: 'preview' } });
        expect(storedSection('s-gift')).toMatchObject({ visible: true });
        expect(storedSection('s-gift')).not.toHaveProperty('hiddenByTheme');
    });

    it('a save that keeps the design names no theme', async () => {
        await openEditor();
        const dialog = await chooseLinen();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Change design' }));
        await save();
        expect(backend.saves.at(-1)?.themeSlug).toBe('linen');
        const switched = backend.saves.length;

        // Undo and redo land back on the saved invitation: nothing to send.
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(screen.getByText('Design: Olive')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
        expect(screen.getByText('Design: Linen')).toBeInTheDocument();
        await save();
        expect(backend.saves).toHaveLength(switched);

        // A content change on the saved design sends no theme.
        fireEvent.click(within(screen.getByRole('group', { name: 'Dress code' })).getByRole('button', { name: 'Hide section' }));
        await save();
        expect(backend.saves).toHaveLength(switched + 1);
        expect(backend.saves.at(-1)).not.toHaveProperty('themeSlug');
        expect(backend.stored()).toMatchObject({ themeSlug: 'linen' });
    });

    it('shows a message when the design fails to load, and the list stays', async () => {
        backend.server.use(http.get(`${TEST_API}/api/invitation-themes/linen`, () => HttpResponse.json({ status: 500 }, { status: 500 })));
        await openEditor();
        fireEvent.click(screen.getByRole('button', { name: 'Change design' }));
        fireEvent.click(await screen.findByRole('button', { name: /Linen/ }, SLOW));

        expect(await screen.findByRole('alert', {}, SLOW)).toHaveTextContent("We couldn't load this design. Try again.");
        expect(screen.getByRole('button', { name: /Linen/ })).toBeEnabled();
    });

    it('shows a message when the designs fail to load, and tries again', async () => {
        backend.server.use(http.get(`${TEST_API}/api/invitation-themes`, () => HttpResponse.json({ status: 500 }, { status: 500 }), { once: true }));
        await openEditor();
        fireEvent.click(screen.getByRole('button', { name: 'Change design' }));

        expect(await screen.findByText("We couldn't load the designs.", {}, SLOW)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        await waitFor(() => expect(screen.getByRole('button', { name: /Linen/ })).toBeInTheDocument());
    });
});
