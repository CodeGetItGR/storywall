import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createDraftServer } from '@/hooks/invitationDraftTestServer';
import en from '@/messages/en.json';
import { AuthContext, type AuthContextValue } from '@/providers/AuthProvider';

import InvitationEditorPage from './PageClient';

// Hoisted above the imports, so the API client reads it when it loads. Same as TEST_API.
vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
});

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
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

// jsdom has no media queries: a computer-wide screen.
vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
}));

// The last move of a drag is sent on release; frames never run here.
vi.stubGlobal('requestAnimationFrame', () => 1);
vi.stubGlobal('cancelAnimationFrame', () => {});

const backend = createDraftServer();
const admin = { user: { role: 'ADMIN' } } as AuthContextValue;

const HEIGHT = 'Drag to change the height. Double-tap to reset.';

async function openEditor(auth: AuthContextValue | null = null) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <AuthContext.Provider value={auth}>
                <QueryClientProvider client={queryClient}>
                    <InvitationEditorPage draftId="draft-1" />
                </QueryClientProvider>
            </AuthContext.Provider>
        </NextIntlClientProvider>,
    );
    await screen.findByLabelText('Text color');
}

const frameOf = (sectionId: string) => document.querySelector<HTMLElement>(`[data-editor-section="${sectionId}"]`)!;

function drag(handle: HTMLElement, dy: number) {
    act(() => {
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100, clientY: 100 + dy });
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: 100, clientY: 100 + dy });
    });
}

function doubleTap(handle: HTMLElement) {
    act(() => {
        for (let count = 0; count < 2; count += 1) {
            fireEvent.pointerDown(handle, { pointerId: 1, clientX: 10, clientY: 10 });
            fireEvent.pointerUp(handle, { pointerId: 1, clientX: 10, clientY: 10 });
        }
    });
}

async function publish() {
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await screen.findByText("Publishing isn't available yet.");
}

const storedSection = (id: string) => backend.stored().document.sections.find((section) => section.id === id)!;

describe('Invitation editor: handles', () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    afterEach(() => {
        cleanup();
        backend.server.resetHandlers();
        backend.reset();
    });
    afterAll(() => backend.server.close());

    it("drags a section's height, undoes it in one step and saves it", async () => {
        await openEditor();
        const handle = within(frameOf('s-faq')).getByRole('slider', { name: HEIGHT });

        drag(handle, 120);
        // jsdom lays nothing out: the section starts at 0px with no content.
        await waitFor(() => expect(document.querySelector('[data-section-id="s-faq"]')).toHaveStyle({ minHeight: '120px', paddingTop: '60px' }));

        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(document.querySelector<HTMLElement>('[data-section-id="s-faq"]')!.style.minHeight).toBe('');
        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));

        await publish();
        expect(storedSection('s-faq').style).toMatchObject({ minHeight: 120, paddingY: 60 });
    });

    it('resets a height with a double tap', async () => {
        await openEditor();
        const handle = within(frameOf('s-photo')).getByRole('slider', { name: HEIGHT });
        doubleTap(handle);
        await publish();
        expect(storedSection('s-photo').style).not.toHaveProperty('minHeight');
    });

    it("keeps the footer's height bar for admins", async () => {
        await openEditor();
        expect(within(frameOf('s-footer')).queryByRole('slider', { name: HEIGHT })).not.toBeInTheDocument();
        cleanup();
        await openEditor(admin);
        expect(within(frameOf('s-footer')).getByRole('slider', { name: HEIGHT })).toBeInTheDocument();
    });

    it('drags the space below a text while it stays open (admins)', async () => {
        await openEditor(admin);
        fireEvent.click(document.querySelector('[data-smd-text="element:b3-text"]')!);
        const below = await screen.findByRole('slider', { name: 'Drag to change the space below the text' });
        expect(screen.getByRole('slider', { name: 'Drag to change the space above the text' })).toBeInTheDocument();
        const start = Number(below.getAttribute('aria-valuenow'));

        drag(below, 12);
        expect(screen.getByRole('toolbar', { name: 'Text tools' })).toBeInTheDocument();
        await waitFor(() => expect(below).toHaveAttribute('aria-valuenow', String(start + 12)));

        await publish();
        const text = storedSection('s-blank-3').elements.find((element) => element.id === 'b3-text');
        expect(text).toMatchObject({ style: { marginBottom: start + 12 } });
    });

    it('shows no text spacing bars to a host', async () => {
        await openEditor();
        fireEvent.click(document.querySelector('[data-smd-text="element:b3-text"]')!);
        await screen.findByRole('toolbar', { name: 'Text tools' });
        expect(screen.queryByRole('slider', { name: 'Drag to change the space below the text' })).not.toBeInTheDocument();
    });
});
