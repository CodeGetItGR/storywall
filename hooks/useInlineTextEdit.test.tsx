import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from 'zustand';

import { useInlineTextEdit } from '@/hooks/useInlineTextEdit';
import { createInvitationEditorStore, EDITOR_MERGE_WINDOW_MS, type InvitationEditorStore } from '@/lib/invitation/editorStore';
import { SAMPLE_DOCUMENT } from '@/lib/invitation/samples';
import { readText, type TextTarget } from '@/lib/invitation/textEditing';

const TEXT: TextTarget = { kind: 'field', sectionId: 's-invitation', path: 'text' };
const TITLE: TextTarget = { kind: 'element', elementId: 'e-inv-title' };
const GODPARENT: TextTarget = { kind: 'field', sectionId: 's-godparents', path: 'godparents.g2.name' };

function setup() {
    const store = createInvitationEditorStore(SAMPLE_DOCUMENT);
    const hook = renderHook(() => {
        const document = useStore(store, (state) => state.document);
        return useInlineTextEdit(store, document);
    });
    return { store, hook, read: (target: TextTarget) => readText(store.getState().document, target) };
}

const steps = (store: InvitationEditorStore) => store.getState().past.length;
const sectionElements = (store: InvitationEditorStore) =>
    store.getState().document.sections.find((section) => section.id === 's-invitation')!.elements;

describe('useInlineTextEdit', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('opens a text and closes it', () => {
        const { hook } = setup();
        act(() => hook.result.current.activate(TEXT, { x: 10, y: 20 }));
        expect(hook.result.current.active).toEqual(TEXT);
        expect(hook.result.current.activeKey).toBe('field:s-invitation:text');
        expect(hook.result.current.caret).toEqual({ x: 10, y: 20 });
        expect(hook.result.current.snapshot?.text).toBe('Με χαρά σας προσκαλούμε…');

        act(() => hook.result.current.deactivate());
        expect(hook.result.current.active).toBeNull();
    });

    it('keeps a burst of typing as one undo step', () => {
        const { store, hook, read } = setup();
        act(() => hook.result.current.activate(TEXT));
        act(() => hook.result.current.setText('Κ'));
        act(() => hook.result.current.setText('Κα'));
        act(() => hook.result.current.setText('Καλ'));
        expect(read(TEXT)?.text).toBe('Καλ');
        expect(steps(store)).toBe(1);

        vi.advanceTimersByTime(EDITOR_MERGE_WINDOW_MS + 1);
        act(() => hook.result.current.setText('Καλώς'));
        expect(steps(store)).toBe(2);

        act(() => hook.result.current.undo());
        expect(read(TEXT)?.text).toBe('Καλ');
        act(() => hook.result.current.undo());
        expect(read(TEXT)?.text).toBe('Με χαρά σας προσκαλούμε…');
        act(() => hook.result.current.redo());
        expect(read(TEXT)?.text).toBe('Καλ');
    });

    it('styles the text being edited, each setting its own step', () => {
        const { store, hook, read } = setup();
        act(() => hook.result.current.activate(TITLE));
        act(() => hook.result.current.setStyle({ size: 40 }));
        act(() => hook.result.current.setStyle({ bold: true }));
        expect(read(TITLE)?.style).toMatchObject({ size: 40, bold: true });
        expect(steps(store)).toBe(2);
    });

    it("colours the fields a section shows when it colours the section", () => {
        const { hook, read } = setup();
        const unregister = hook.result.current.registerField('s-invitation', 'text');
        act(() => hook.result.current.activate(TITLE));
        act(() => hook.result.current.applyColor('#123456', 'section'));
        expect(read(TEXT)?.style.color).toBe('#123456');
        expect(read(TITLE)?.style.color).toBe('#123456');
        unregister();
    });

    it('adds a text after the one being edited and opens it with its wording selected', () => {
        const { store, hook, read } = setup();
        act(() => hook.result.current.activate(TITLE));
        act(() => hook.result.current.addText('paragraph'));

        const added = sectionElements(store)[1];
        expect(added).toMatchObject({ kind: 'text', role: 'paragraph', text: 'Νέα παράγραφος' });
        expect(hook.result.current.active).toEqual({ kind: 'element', elementId: added.id });
        expect(hook.result.current.caret).toBe('all');
        expect(read(hook.result.current.active!)?.style.size).toBe(16);
    });

    it('removes an added text left empty when the host moves on', () => {
        const { store, hook } = setup();
        act(() => hook.result.current.activate(TEXT));
        act(() => hook.result.current.addText('title'));
        act(() => hook.result.current.setText(''));
        act(() => hook.result.current.activate(GODPARENT));
        expect(sectionElements(store)).toHaveLength(1);
        expect(hook.result.current.active).toEqual(GODPARENT);
    });

    it('keeps an empty section text', () => {
        const { hook, read } = setup();
        act(() => hook.result.current.activate(TEXT));
        act(() => hook.result.current.setText(''));
        act(() => hook.result.current.deactivate());
        expect(read(TEXT)?.text).toBe('');
    });

    it('removes an added text at once', () => {
        const { store, hook } = setup();
        act(() => hook.result.current.activate(TITLE));
        act(() => hook.result.current.requestDelete());
        expect(sectionElements(store)).toHaveLength(0);
        expect(hook.result.current.active).toBeNull();
        expect(hook.result.current.isConfirmingDelete).toBe(false);

        act(() => store.getState().undo());
        expect(sectionElements(store)).toHaveLength(1);
    });

    it("asks before emptying a section's own text", () => {
        const { hook, read } = setup();
        act(() => hook.result.current.activate(TEXT));
        act(() => hook.result.current.requestDelete());
        expect(hook.result.current.isConfirmingDelete).toBe(true);
        expect(read(TEXT)?.text).not.toBe('');

        act(() => hook.result.current.cancelDelete());
        expect(hook.result.current.isConfirmingDelete).toBe(false);
        expect(hook.result.current.active).toEqual(TEXT);

        act(() => hook.result.current.requestDelete());
        act(() => hook.result.current.confirmDelete());
        expect(read(TEXT)?.text).toBe('');
        expect(hook.result.current.active).toBeNull();
    });

    it('stops editing a text an undo took away', () => {
        const { store, hook } = setup();
        act(() => hook.result.current.activate(TEXT));
        act(() => hook.result.current.addText('subtitle'));
        expect(hook.result.current.active?.kind).toBe('element');
        act(() => store.getState().undo());
        expect(hook.result.current.active).toBeNull();
    });

    it('cannot add to a locked section', () => {
        const { hook } = setup();
        act(() => hook.result.current.activate({ kind: 'field', sectionId: 's-footer', path: 'text' }));
        expect(hook.result.current.canAddText).toBe(false);
        act(() => hook.result.current.activate(TEXT));
        expect(hook.result.current.canAddText).toBe(true);
    });
});
