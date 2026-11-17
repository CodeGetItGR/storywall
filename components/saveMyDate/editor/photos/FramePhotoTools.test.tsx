import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from 'zustand';

import { CanvasHandles } from '@/components/saveMyDate/editor/handles/CanvasHandles';
import { useCanvasHandles } from '@/components/saveMyDate/editor/handles/CanvasHandlesContext';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { InvitationDocument } from '@/lib/invitation/document';
import { createInvitationEditorStore, type InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import en from '@/messages/en.json';
import { AuthContext, type AuthContextValue } from '@/providers/AuthProvider';

vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

const admin = { user: { role: 'ADMIN' } } as AuthContextValue;
const media = (id: string) => `/images/${id}.png`;
const FRAMES = SAMPLE_THEME.frames;

function Canvas({ store }: { store: InvitationEditorStore }) {
    const document = useStore(store, (state) => state.document);
    const tools = useCanvasHandles()?.tools;
    return <InvitationRenderer document={document} theme={SAMPLE_THEME} media={media} canvasTools={tools} />;
}

// The frame and photo band sections in the editor, with their tools.
function renderCanvas({ auth = null, frame = {} }: { auth?: AuthContextValue | null; frame?: Partial<PhotoFrameElement> } = {}) {
    const sections = SAMPLE_DOCUMENT.sections
        .filter((section) => section.type === 'photoFrame' || section.type === 'photo')
        .map((section) =>
            section.type === 'photoFrame'
                ? { ...section, elements: section.elements.map((element) => (element.kind === 'photoFrame' ? { ...element, ...frame } : element)) }
                : section,
        );
    const document: InvitationDocument = { ...SAMPLE_DOCUMENT, sections };
    const store = createInvitationEditorStore(document);
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <AuthContext.Provider value={auth}>
                <CanvasHandles store={store} frames={FRAMES}>
                    <Canvas store={store} />
                </CanvasHandles>
            </AuthContext.Provider>
        </NextIntlClientProvider>,
    );
    return store;
}

const frameIn = (store: InvitationEditorStore) =>
    store
        .getState()
        .document.sections.flatMap((section) => section.elements)
        .find((element) => element.kind === 'photoFrame') as PhotoFrameElement;

const bandIn = (store: InvitationEditorStore) => {
    const band = store.getState().document.sections.find((section) => section.type === 'photo');
    return band?.type === 'photo' ? band.data.imageY : null;
};

function drag(handle: HTMLElement, dx: number, dy: number) {
    act(() => {
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
    });
}

beforeEach(() => {
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

describe('Frame photo tools', () => {
    it('zooms the framed photo in steps, each its own undo step', () => {
        const store = renderCanvas();
        expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
        fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
        expect(frameIn(store).zoom).toBe(1.3);
        expect(store.getState().past).toHaveLength(2);

        act(() => store.getState().undo());
        expect(frameIn(store).zoom).toBe(1.15);
        expect(screen.getByRole('button', { name: 'Zoom out' })).toBeEnabled();
    });

    it('stops zooming in at 3x', () => {
        renderCanvas({ frame: { zoom: 3 } });
        expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    });

    it('moves the photo with the move button, by drag or arrow keys', () => {
        const store = renderCanvas();
        const move = within(document.querySelector<HTMLElement>('.photo-frame-el')!).getByRole('button', { name: 'Move photo' });

        // A box too small to measure counts as 60px across.
        drag(move, 6, -12);
        expect(frameIn(store)).toMatchObject({ imageX: 60, imageY: 30 });
        expect(store.getState().past).toHaveLength(1);

        fireEvent.keyDown(move, { key: 'ArrowLeft' });
        expect(frameIn(store)).toMatchObject({ imageX: 55, imageY: 30 });
    });

    it('zooms with the mouse wheel', () => {
        const store = renderCanvas();
        act(() => {
            fireEvent.wheel(screen.getByTestId('frame-photo-surface'), { deltaY: -100 });
        });
        expect(frameIn(store).zoom).toBeGreaterThan(1);
    });

    it('counts every quick wheel notch', () => {
        const store = renderCanvas();
        const surface = screen.getByTestId('frame-photo-surface');
        act(() => {
            fireEvent.wheel(surface, { deltaY: -100 });
            fireEvent.wheel(surface, { deltaY: -100 });
        });
        expect(frameIn(store).zoom).toBe(1.3);
    });

    it('leaves the wheel to the page at the zoom limits', () => {
        const store = renderCanvas();
        const surface = screen.getByTestId('frame-photo-surface');
        // fireEvent returns false when the event was cancelled.
        let scrolled = false;
        act(() => {
            scrolled = fireEvent.wheel(surface, { deltaY: 100 });
        });
        expect(scrolled).toBe(true);
        expect(frameIn(store).zoom).toBe(1);
    });

    it('gives hosts no frame lists, and hides a frame not chosen yet', () => {
        renderCanvas({ frame: { frameId: '' } });
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        expect(document.querySelector('.photo-frame-el')).toBeNull();
    });

    it('lets an admin pick the frame and its effect', () => {
        const store = renderCanvas({ auth: admin });
        const frame = screen.getByRole('combobox', { name: 'Frame' });
        expect(frame).toHaveValue('fr-oval');

        fireEvent.change(screen.getByRole('combobox', { name: 'Frame effect' }), { target: { value: 'pop-elegant' } });
        expect(frameIn(store).animation).toBe('pop-elegant');

        fireEvent.change(frame, { target: { value: '' } });
        expect(frameIn(store).frameId).toBe('');
        // The empty box stays, so the admin can pick one again.
        expect(screen.getByRole('combobox', { name: 'Frame' })).toHaveValue('');
        expect(screen.getByRole('option', { name: 'Choose a frame' })).toBeInTheDocument();
        expect(document.querySelector('.photo-frame-not-chosen')).not.toBeNull();
    });
});

describe('Photo band move', () => {
    it('moves the band photo up and down', () => {
        const store = renderCanvas();
        const band = within(document.querySelector<HTMLElement>('.photo-section-inner')!).getByRole('button', { name: 'Move photo' });

        fireEvent.keyDown(band, { key: 'ArrowUp' });
        expect(bandIn(store)).toBe(55);

        // Dragging down shows more of the top.
        drag(band, 0, 12);
        expect(bandIn(store)).toBe(35);
    });
});
