import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createDraftServer } from '@/hooks/invitationDraftTestServer';
import en from '@/messages/en.json';

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

// jsdom has no media queries: a computer-wide screen, so the toolbar floats over the text.
vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
}));

const backend = createDraftServer();

// An added text and a section's own text in the sample draft.
const WAITING = 'element:b3-text';
const BABY_MESSAGE = 'field:s-baby:babyMessage';

async function openEditor() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <QueryClientProvider client={queryClient}>
                <InvitationEditorPage draftId="draft-1" />
            </QueryClientProvider>
        </NextIntlClientProvider>,
    );
    await screen.findByLabelText('Text color');
}

// The text being typed in.
function activeText() {
    return document.querySelector<HTMLElement>('.smd-text-active')!;
}

// A text on the canvas by its key: the invitation has the same wording in more than one place.
function canvasText(key: string) {
    return document.querySelector<HTMLElement>(`[data-smd-text="${key}"]`);
}

function openText(key: string) {
    fireEvent.click(canvasText(key)!);
    return screen.getByRole('toolbar', { name: 'Text tools' });
}

function paste(text: string) {
    fireEvent.paste(activeText(), { clipboardData: { getData: (type: string) => (type === 'text/plain' ? text : '') } });
}

function storedElement(id: string) {
    return backend
        .stored()
        .document.sections.flatMap((section) => section.elements)
        .find((element) => element.id === id);
}

describe('Invitation editor: texts', () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    afterEach(() => {
        cleanup();
        backend.server.resetHandlers();
        backend.reset();
    });
    afterAll(() => backend.server.close());

    it('opens a text for typing in place, with the text tools', async () => {
        await openEditor();
        const toolbar = openText(WAITING);

        expect(activeText()).toHaveAttribute('contenteditable', 'true');
        expect(activeText()).toHaveTextContent('Σας περιμένουμε!');
        expect(activeText()).toHaveFocus();
        expect(within(toolbar).getByLabelText('Size')).toHaveValue('20');
        expect(within(toolbar).getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('types, undoes and saves', async () => {
        await openEditor();
        openText(WAITING);

        paste(' Ελάτε');
        expect(activeText()).toHaveTextContent('Σας περιμένουμε! Ελάτε');
        expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();

        fireEvent.keyDown(activeText(), { key: 'z', ctrlKey: true });
        await waitFor(() => expect(activeText()).toHaveTextContent(/^Σας περιμένουμε!$/));

        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
        await waitFor(() => expect(activeText()).toHaveTextContent('Σας περιμένουμε! Ελάτε'));

        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
        await screen.findByText("Publishing isn't available yet.");
        expect(storedElement('b3-text')).toMatchObject({ text: 'Σας περιμένουμε! Ελάτε' });
    });

    it('styles the text from the toolbar', async () => {
        await openEditor();
        const toolbar = openText(WAITING);

        fireEvent.change(within(toolbar).getByLabelText('Size'), { target: { value: '40' } });
        expect(activeText()).toHaveStyle({ fontSize: '40px' });
        fireEvent.click(within(toolbar).getByRole('button', { name: 'Bold' }));
        fireEvent.click(within(toolbar).getByRole('button', { name: 'Align left' }));

        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
        await screen.findByText("Publishing isn't available yet.");
        expect(storedElement('b3-text')).toMatchObject({ style: { size: 40, bold: true, italic: true, align: 'left' } });
    });

    it('adds a text after the one being edited and removes it', async () => {
        await openEditor();
        const toolbar = openText(WAITING);

        fireEvent.click(within(toolbar).getByRole('button', { name: 'Add text' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Paragraph' }));

        await waitFor(() => expect(activeText()).toHaveTextContent('Νέα παράγραφος'));
        fireEvent.click(within(screen.getByRole('toolbar', { name: 'Text tools' })).getByRole('button', { name: 'Delete text' }));

        expect(screen.queryByText('Νέα παράγραφος')).not.toBeInTheDocument();
        expect(canvasText(WAITING)).toHaveTextContent('Σας περιμένουμε!');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByRole('toolbar', { name: 'Text tools' })).not.toBeInTheDocument();
    });

    it("asks before emptying a section's own text", async () => {
        await openEditor();
        openText(BABY_MESSAGE);
        fireEvent.click(within(screen.getByRole('toolbar', { name: 'Text tools' })).getByRole('button', { name: 'Delete text' }));

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent('Delete this text?');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(canvasText(BABY_MESSAGE)).toHaveAccessibleName('Empty text');
        expect(canvasText(BABY_MESSAGE)).toHaveTextContent(/^$/);

        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(canvasText(BABY_MESSAGE)).toHaveTextContent('Σας περιμένουμε!');
    });

    it('stops editing on a tap outside the texts', async () => {
        await openEditor();
        openText(WAITING);
        act(() => {
            fireEvent.pointerDown(document.querySelector('.smd-invitation')!);
        });
        expect(screen.queryByRole('toolbar', { name: 'Text tools' })).not.toBeInTheDocument();
        expect(canvasText(WAITING)).toHaveAttribute('role', 'button');
    });
});
