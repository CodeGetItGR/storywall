import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createDraftServer } from '@/hooks/invitationDraftTestServer';
import { sampleDraftDto } from '@/lib/invitation/sampleDraft';
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

// The sections' order in the draft the editor opened.
function sampleOrder() {
    return sampleDraftDto().document.sections.map((section) => section.id);
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
        expect(screen.getByRole('textbox', { name: 'Text' })).toBe(activeText());
        expect(within(toolbar).getByLabelText('Size')).toHaveValue('20');
        expect(within(toolbar).getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('moves from the text to its toolbar and back by keyboard', async () => {
        await openEditor();
        const toolbar = openText(WAITING);
        const first = within(toolbar).getAllByRole('button')[0];

        fireEvent.keyDown(activeText(), { key: 'Tab' });
        expect(first).toHaveFocus();
        fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
        expect(activeText()).toHaveFocus();
        fireEvent.keyDown(activeText(), { key: 'F10', altKey: true });
        expect(first).toHaveFocus();
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

    it('empties a part of the date and types a new one', async () => {
        await openEditor();
        const day = '[data-smd-text$=":number"]';
        const dayKey = document.querySelector(day)!.getAttribute('data-smd-text')!;
        openText(dayKey);
        expect(activeText()).toHaveTextContent(/^12$/);
        fireEvent.click(within(screen.getByRole('toolbar', { name: 'Text tools' })).getByRole('button', { name: 'Delete text' }));
        fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

        // Emptied, the part shows the date's own day again, as guests see it.
        expect(canvasText(dayKey)).toHaveTextContent(/^12$/);
        openText(dayKey);
        expect(activeText()).toHaveTextContent(/^$/);
        paste('15');
        expect(activeText()).toHaveTextContent(/^15$/);

        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
        await screen.findByText("Publishing isn't available yet.");
        const date = backend.stored().document.sections.find((section) => section.type === 'date');
        expect(date?.data).toMatchObject({ number: '15' });
    });

    it('edits a text in a section that was moved', async () => {
        await openEditor();
        const frame = canvasText(WAITING)!.closest<HTMLElement>('[data-editor-section]')!;
        const sectionId = frame.dataset.editorSection!;
        const order = () => backend.stored().document.sections.map((section) => section.id).indexOf(sectionId);
        fireEvent.pointerDown(frame);
        fireEvent.click(within(frame).getByRole('button', { name: 'Section options' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Move up' }));

        openText(WAITING);
        paste(' Ελάτε');
        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
        await screen.findByText("Publishing isn't available yet.");
        expect(storedElement('b3-text')).toMatchObject({ text: 'Σας περιμένουμε! Ελάτε' });
        const before = sampleOrder().indexOf(sectionId);
        expect(order()).toBe(before - 1);
    });

    it('edits a text in a section that was just added', async () => {
        // Without its invitation text, so the add list offers one.
        const draft = sampleDraftDto().document;
        backend.saveElsewhere({ ...draft, sections: draft.sections.filter((section) => section.type !== 'invitation') });
        await openEditor();
        const frame = canvasText(WAITING)!.closest<HTMLElement>('[data-editor-section]')!;
        fireEvent.pointerDown(frame);
        fireEvent.click(within(frame).getAllByRole('button', { name: 'Add section' }).at(-1)!);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Invitation text' }));

        const added = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[data-editor-section] [data-smd-text^="field:"][data-smd-text$=":text"]');
            expect(found?.closest('[data-editor-section]')).not.toBe(frame);
            return found!;
        });
        const key = added.getAttribute('data-smd-text')!;
        openText(key);
        expect(activeText()).toHaveFocus();
        paste(' Ελάτε');

        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
        await screen.findByText("Publishing isn't available yet.");
        const section = backend.stored().document.sections.find((item) => item.type === 'invitation');
        expect(section?.data).toMatchObject({ text: expect.stringMatching(/ Ελάτε$/) });
    });

    it('stops editing on a tap outside the texts', async () => {
        await openEditor();
        openText(WAITING);
        const canvas = document.querySelector('.smd-invitation')!;
        act(() => {
            fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 100, clientY: 100 });
            fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 102, clientY: 103 });
        });
        expect(screen.queryByRole('toolbar', { name: 'Text tools' })).not.toBeInTheDocument();
        expect(canvasText(WAITING)).toHaveAttribute('role', 'button');
    });

    it('keeps editing when a scroll starts outside the texts', async () => {
        await openEditor();
        openText(WAITING);
        const canvas = document.querySelector('.smd-invitation')!;
        act(() => {
            // The finger moves: a scroll.
            fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 100, clientY: 300 });
            fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 100, clientY: 120 });
            // The browser takes the touch over for scrolling.
            fireEvent.pointerDown(canvas, { pointerId: 2, clientX: 100, clientY: 300 });
            fireEvent.pointerCancel(canvas, { pointerId: 2 });
            fireEvent.pointerUp(canvas, { pointerId: 2, clientX: 100, clientY: 300 });
        });
        expect(screen.getByRole('toolbar', { name: 'Text tools' })).toBeInTheDocument();
        expect(activeText()).toHaveFocus();
    });
});
