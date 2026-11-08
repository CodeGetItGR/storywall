import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDraftServer, TEST_API } from '@/hooks/invitationDraftTestServer';
import en from '@/messages/en.json';

import InvitationEditorPage from './PageClient';

// Hoisted above the imports, so the API client reads it when it loads. Same as TEST_API.
vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
});

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
// The editor was opened from another page of the app, so back steps back.
vi.mock('@/lib/inAppHistory', () => ({ hasInAppPrevious: () => true }));
// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
// jsdom has no ResizeObserver, and the gift section's IBAN box needs one.
vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        disconnect() {}
    },
);

const backend = createDraftServer();

async function openEditor() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(
        <NextIntlClientProvider locale="en" messages={en}>
            <QueryClientProvider client={queryClient}>
                <InvitationEditorPage draftId="draft-1" />
            </QueryClientProvider>
        </NextIntlClientProvider>,
    );
    const color = await screen.findByLabelText('Text color');
    return { ...view, color };
}

function pick(input: HTMLElement, value: string) {
    fireEvent.change(input, { target: { value } });
}

// The save status in the top bar. The invitation has status lines of its own.
function saveStatus() {
    return within(screen.getByRole('banner', { hidden: true })).getByRole('status', { hidden: true });
}

function closeTab() {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
}

describe('Invitation editor page', () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    beforeEach(() => {
        router.back.mockReset();
        router.push.mockReset();
    });
    afterEach(() => {
        cleanup();
        backend.server.resetHandlers();
        backend.reset();
    });
    afterAll(() => backend.server.close());

    it('edits, undoes and redoes the text colour', async () => {
        const { color } = await openEditor();
        const original = (color as HTMLInputElement).value;
        expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();

        pick(color, '#112233');
        expect(color).toHaveValue('#112233');
        expect(saveStatus()).toHaveTextContent('Unsaved changes');

        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(color).toHaveValue(original);

        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
        expect(color).toHaveValue('#112233');

        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        expect(color).toHaveValue(original);
    });

    it('saves before the preview opens', async () => {
        const { color } = await openEditor();
        pick(color, '#112233');

        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

        await screen.findByRole('dialog');
        expect(backend.saves).toHaveLength(1);
        expect(backend.saves[0]).toMatchObject({ revision: 4, document: { overrides: { textColor: '#112233' } } });
        expect(saveStatus()).toHaveTextContent('Saved');
    });

    it('saves, then says publishing is not ready', async () => {
        const { color } = await openEditor();
        pick(color, '#112233');

        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

        expect(await screen.findByText("Publishing isn't available yet.")).toBeInTheDocument();
        expect(backend.stored().document.overrides.textColor).toBe('#112233');
    });

    it('stops on a conflict and loads the newer version', async () => {
        const { color } = await openEditor();
        const newer = { ...backend.stored().document, overrides: { ...backend.stored().document.overrides, textColor: '#000000' } };
        backend.saveElsewhere(newer);
        pick(color, '#112233');

        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent('This invitation has newer changes.');
        expect(backend.stored().document.overrides.textColor).toBe('#000000');

        fireEvent.click(within(dialog).getByRole('button', { name: 'Load the newer version' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByLabelText('Text color')).toHaveValue('#000000');
        expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    });

    it('warns before leaving with unsaved changes', async () => {
        const { color } = await openEditor();
        expect(closeTab()).toBe(false);

        pick(color, '#112233');
        expect(closeTab()).toBe(true);
    });

    it('saves on back, and asks when the save fails', async () => {
        const { color } = await openEditor();
        pick(color, '#112233');
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        await waitFor(() => expect(router.back).toHaveBeenCalledOnce());
        expect(backend.saves).toHaveLength(1);

        backend.server.use(http.put(`${TEST_API}/api/invitation-drafts/:id`, () => HttpResponse.json({ status: 400 }, { status: 400 })));
        pick(screen.getByLabelText('Text color'), '#445566');
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent("Your changes aren't saved.");
        expect(router.back).toHaveBeenCalledOnce();
        expect(screen.getByText('Not saved')).toBeInTheDocument();
    });

    it('shows the error when the draft cannot be loaded', async () => {
        backend.server.use(http.get(`${TEST_API}/api/invitation-drafts/:id`, () => HttpResponse.json({ status: 404 }, { status: 404 })));
        render(
            <NextIntlClientProvider locale="en" messages={en}>
                <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                    <InvitationEditorPage draftId="draft-1" />
                </QueryClientProvider>
            </NextIntlClientProvider>,
        );
        expect(await screen.findByText("We couldn't load this invitation.")).toBeInTheDocument();
    });
});
