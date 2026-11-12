import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from 'zustand';

import { CanvasHandles } from '@/components/saveMyDate/editor/handles/CanvasHandles';
import { useCanvasHandles } from '@/components/saveMyDate/editor/handles/CanvasHandlesContext';
import { SectionHeightHandle } from '@/components/saveMyDate/editor/handles/SectionHeightHandle';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { readEditableDraft } from '@/lib/invitation/drafts';
import { createInvitationEditorStore, type InvitationEditorStore } from '@/lib/invitation/editorStore';
import { sampleDraftDto } from '@/lib/invitation/sampleDraft';
import { previewMedia } from '@/lib/saveMyDatePreview';
import en from '@/messages/en.json';
import { AuthContext, type AuthContextValue } from '@/providers/AuthProvider';

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

const draft = readEditableDraft(sampleDraftDto());
// The sample draft has no frame images; the staging preview's are drawn in place.
const media = (mediaId: string) => draft.media(mediaId) ?? previewMedia(mediaId);
const admin = { user: { role: 'ADMIN' } } as AuthContextValue;

// The editor canvas without its frames: the renderer with the handles' places filled.
function Canvas({ store }: { store: InvitationEditorStore }) {
    const document = useStore(store, (state) => state.document);
    const tools = useCanvasHandles()?.tools;
    return <InvitationRenderer document={document} theme={draft.theme} media={media} canvasTools={tools} />;
}

function renderCanvas(auth: AuthContextValue | null = null) {
    const store = createInvitationEditorStore(draft.document);
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <AuthContext.Provider value={auth}>
                <CanvasHandles store={store}>
                    <Canvas store={store} />
                </CanvasHandles>
            </AuthContext.Provider>
        </NextIntlClientProvider>,
    );
    return store;
}

const elementIn = (store: InvitationEditorStore, id: string) =>
    store
        .getState()
        .document.sections.flatMap((section) => section.elements)
        .find((element) => element.id === id);

const sectionIn = (store: InvitationEditorStore, id: string) => store.getState().document.sections.find((section) => section.id === id)!;

const order = (store: InvitationEditorStore, sectionId: string) => sectionIn(store, sectionId).elements.map((element) => element.id);

function drag(handle: HTMLElement, dx: number, dy: number) {
    act(() => {
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100 + dx / 2, clientY: 100 + dy / 2 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
    });
}

function tap(handle: HTMLElement) {
    act(() => {
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: 10, clientY: 10 });
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: 10, clientY: 10 });
    });
}

beforeEach(() => {
    // The last move of a drag is sent on release; frames never run here.
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            disconnect() {}
        },
    );
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('Canvas handles', () => {
    it('gives a host the spacer and photo frame handles only', () => {
        renderCanvas();
        expect(screen.getAllByRole('slider', { name: 'Drag to change the space' })).toHaveLength(1);
        // The photo frame's dot.
        expect(screen.getAllByRole('slider', { name: 'Drag to resize' })).toHaveLength(1);
        expect(screen.queryByRole('button', { name: 'One place forward' })).not.toBeInTheDocument();
        expect(screen.queryByText('2 columns')).not.toBeInTheDocument();
    });

    it('gives an admin the image, decoration and custom section tools too', () => {
        renderCanvas(admin);
        // The added image, the decoration and the photo frame.
        expect(screen.getAllByRole('slider', { name: 'Drag to resize' })).toHaveLength(3);
        expect(screen.getAllByRole('button', { name: 'One place forward' }).length).toBeGreaterThan(0);
        expect(screen.getByText('2 columns')).toBeInTheDocument();
    });

    it('drags a spacer taller in one undo step', () => {
        const store = renderCanvas();
        const handle = screen.getByRole('slider', { name: 'Drag to change the space' });
        expect(handle).toHaveAttribute('aria-valuetext', '24 px');

        drag(handle, 0, 30);
        expect(elementIn(store, 'b3-space')).toMatchObject({ height: 54 });
        expect(store.getState().past).toHaveLength(1);
        expect(handle).toHaveAttribute('aria-valuetext', '54 px');

        act(() => store.getState().undo());
        expect(elementIn(store, 'b3-space')).toMatchObject({ height: 24 });
    });

    it('changes a spacer with the arrow keys', () => {
        const store = renderCanvas();
        const handle = screen.getByRole('slider', { name: 'Drag to change the space' });
        fireEvent.keyDown(handle, { key: 'ArrowUp', shiftKey: true });
        expect(elementIn(store, 'b3-space')).toMatchObject({ height: 34 });
    });

    it("drags an image wider and a decoration's width", () => {
        const store = renderCanvas(admin);
        const image = document.querySelector<HTMLElement>('[data-section-id="s-blank-1"] [role="slider"]')!;
        drag(image, 40, 5);
        expect(elementIn(store, 'b1-leaf')).toMatchObject({ width: 220 });

        const decoration = document.querySelector<HTMLElement>('[data-section-id="s-parentsSimple"] [role="slider"]')!;
        drag(decoration, -60, 0);
        expect(sectionIn(store, 's-parentsSimple').data).toMatchObject({ decoration: { width: 160 } });
    });

    it('scales a photo frame against its box', () => {
        const store = renderCanvas();
        const handle = document.querySelector<HTMLElement>('[data-section-id="s-photoFrame"] [role="slider"]')!;
        handle.parentElement!.getBoundingClientRect = () => ({ width: 200, height: 300 }) as DOMRect;
        expect(handle).toHaveAttribute('aria-valuetext', '100%');

        drag(handle, 50, 30);
        expect(elementIn(store, 'e-frame')).toMatchObject({ boxScale: 1.25 });
        expect(handle).toHaveAttribute('aria-valuetext', '125%');
    });

    it('moves a custom section item and the column split', () => {
        const store = renderCanvas(admin);
        const columns = document.querySelector<HTMLElement>('[data-section-id="s-blank-2"]')!;
        const before = order(store, 's-blank-2');
        expect(before).toEqual(['b2-head', 'b2-left', 'b2-break', 'b2-right']);

        fireEvent.click(within(columns).getByRole('button', { name: 'Move one item to the left column' }));
        expect(order(store, 's-blank-2')).toEqual(['b2-head', 'b2-left', 'b2-right', 'b2-break']);
        // Nothing is left on the right: the split can't go further.
        expect(within(columns).getByRole('button', { name: 'Move one item to the left column' })).toBeDisabled();

        act(() => store.getState().undo());
        const head = within(columns).getByText('Πρόγραμμα').closest<HTMLElement>('.group\\/item')!;
        // The heading has no other full-width item to swap with.
        expect(within(head).queryByRole('button', { name: 'One place forward' })).not.toBeInTheDocument();
        const left = within(columns).getByText(/Τελετή/).closest<HTMLElement>('.group\\/item')!;
        expect(within(left).getByRole('button', { name: 'One place back' })).toBeDisabled();
        fireEvent.click(within(left).getByRole('button', { name: 'One place forward' }));
        expect(order(store, 's-blank-2')).toEqual(['b2-head', 'b2-break', 'b2-left', 'b2-right']);
    });
});

// A section frame as the editor draws it, with the content's size set by the test.
function HeightFrame({ store, id }: { store: InvitationEditorStore; id: string }) {
    const section = useStore(store, (state) => state.document.sections.find((item) => item.id === id)!);
    return (
        <div data-editor-section={id} className="relative">
            <section data-section-id={id}>
                <div className="section-inner" />
            </section>
            <SectionHeightHandle section={section} edit={store.getState().edit} />
        </div>
    );
}

function renderHeightHandle(id: string) {
    const store = createInvitationEditorStore(draft.document);
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <HeightFrame store={store} id={id} />
        </NextIntlClientProvider>,
    );
    const section = document.querySelector<HTMLElement>(`[data-section-id="${id}"]`)!;
    section.getBoundingClientRect = () => ({ height: 300 }) as DOMRect;
    Object.defineProperty(section.querySelector('.section-inner'), 'scrollHeight', { value: 200 });
    return { store, handle: screen.getByRole('slider', { name: 'Drag to change the height. Double-tap to reset.' }) };
}

describe('Section height handle', () => {
    it('drags the height, splits the room as padding and resets with a double tap', () => {
        const { store, handle } = renderHeightHandle('s-faq');
        drag(handle, 0, 100);
        expect(sectionIn(store, 's-faq').style).toMatchObject({ minHeight: 400, paddingY: 100 });
        expect(store.getState().past).toHaveLength(1);

        tap(handle);
        tap(handle);
        expect(sectionIn(store, 's-faq').style).not.toHaveProperty('minHeight');
        expect(sectionIn(store, 's-faq').style).not.toHaveProperty('paddingY');
        expect(store.getState().past).toHaveLength(2);
    });

    it('never shrinks a section past its content', () => {
        const { store, handle } = renderHeightHandle('s-faq');
        drag(handle, 0, -400);
        expect(sectionIn(store, 's-faq').style).toMatchObject({ minHeight: 240, paddingY: 20 });
    });

    it('does nothing on a double tap when nothing was saved', () => {
        const { store, handle } = renderHeightHandle('s-faq');
        tap(handle);
        tap(handle);
        expect(store.getState().past).toHaveLength(0);
    });

    it('sits inside the footer, on the left', () => {
        const { handle } = renderHeightHandle('s-footer');
        expect(handle).toHaveClass('left-2', 'bottom-0');
        expect(handle).not.toHaveClass('translate-y-1/2');
    });
});

// An admin's theme editor: the store holds the theme, and the canvas draws it.
function ThemeCanvas({ store }: { store: InvitationEditorStore }) {
    const document = useStore(store, (state) => state.document);
    const theme = useStore(store, (state) => state.theme!);
    const tools = useCanvasHandles()?.tools;
    return <InvitationRenderer document={document} theme={theme} media={media} canvasTools={tools} />;
}

function renderThemeCanvas() {
    const store = createInvitationEditorStore(draft.document, draft.theme, { imageId: null });
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <AuthContext.Provider value={admin}>
                <CanvasHandles store={store}>
                    <ThemeCanvas store={store} />
                </CanvasHandles>
            </AuthContext.Provider>
        </NextIntlClientProvider>,
    );
    return store;
}

describe('Theme canvas tools', () => {
    it('leaves the element picker and the art size out of the host editor', () => {
        renderCanvas(admin);
        expect(screen.queryByRole('combobox', { name: 'Pick an element' })).not.toBeInTheDocument();
        expect(document.querySelector('.wedart-asset-wrap [role="slider"]')).toBeNull();
    });

    it('picks the element of a family section, and keeps the slot once it is taken out', () => {
        const store = renderThemeCanvas();
        const section = document.querySelector<HTMLElement>('[data-section-id="s-parentsSimple"]')!;
        const picker = within(section).getByRole('combobox', { name: 'Pick an element' });
        expect(picker).toHaveValue('el-leaf');

        fireEvent.change(picker, { target: { value: '' } });
        expect(sectionIn(store, 's-parentsSimple').data).not.toHaveProperty('decoration');
        expect(within(section).getByRole('combobox', { name: 'Pick an element' })).toHaveValue('');

        fireEvent.change(within(section).getByRole('combobox', { name: 'Pick an element' }), { target: { value: 'el-leaf' } });
        expect(sectionIn(store, 's-parentsSimple').data).toMatchObject({ decoration: { image: { source: 'theme', assetId: 'el-leaf' }, width: 220 } });
        act(() => store.getState().undo());
        expect(sectionIn(store, 's-parentsSimple').data).not.toHaveProperty('decoration');
    });

    it('sizes the main illustration by dragging or with the arrow keys', () => {
        const store = renderThemeCanvas();
        const handle = document.querySelector<HTMLElement>('.wedart-asset-wrap [role="slider"]')!;
        expect(handle).toHaveAttribute('aria-valuetext', '80%');

        drag(handle, 210, 0);
        expect(store.getState().theme?.art.main?.scale).toBe(1.3);
        expect(store.getState().past).toHaveLength(1);

        fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
        expect(store.getState().theme?.art.main?.scale).toBe(1.2);
        expect(handle).toHaveAttribute('aria-valuetext', '120%');
    });
});
