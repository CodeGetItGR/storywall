import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InvitationDocument } from '@/lib/invitation/document';
import { createInvitationEditorStore, EDITOR_HISTORY_LIMIT, EDITOR_MERGE_WINDOW_MS } from '@/lib/invitation/editorStore';
import { previewDocument } from '@/lib/saveMyDatePreview';

const setColor = (color: string) => (draft: { overrides: InvitationDocument['overrides'] }) => {
    draft.overrides.textColor = color;
};

describe('createInvitationEditorStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts from the document with no history', () => {
        const document = previewDocument();
        const store = createInvitationEditorStore(document);
        expect(store.getState()).toMatchObject({ document, past: [], future: [], changeCount: 0 });
    });

    it('applies an edit and counts it', () => {
        const store = createInvitationEditorStore(previewDocument());
        store.getState().edit(setColor('#112233'));
        expect(store.getState().document.overrides.textColor).toBe('#112233');
        expect(store.getState().past).toHaveLength(1);
        expect(store.getState().changeCount).toBe(1);
    });

    it('ignores an edit that changes nothing', () => {
        const store = createInvitationEditorStore(previewDocument());
        store.getState().edit(() => {});
        expect(store.getState().past).toHaveLength(0);
        expect(store.getState().changeCount).toBe(0);
    });

    it('undoes and redoes exactly, keeping untouched sections as they were', () => {
        const original = previewDocument();
        const store = createInvitationEditorStore(original);
        store.getState().edit((draft) => {
            draft.sections[1].visible = false;
        });
        store.getState().undo();
        expect(store.getState().document).toEqual(original);
        // Structural sharing: the sections the edit never touched are the same objects.
        expect(store.getState().document.sections[2]).toBe(original.sections[2]);

        store.getState().redo();
        expect(store.getState().document.sections[1].visible).toBe(false);
        expect(store.getState().changeCount).toBe(3);
    });

    it('drops the redo steps after a new edit', () => {
        const store = createInvitationEditorStore(previewDocument());
        store.getState().edit(setColor('#111111'));
        store.getState().undo();
        store.getState().edit(setColor('#222222'));
        expect(store.getState().future).toHaveLength(0);
        store.getState().redo();
        expect(store.getState().document.overrides.textColor).toBe('#222222');
    });

    it('does nothing on undo or redo with no steps', () => {
        const store = createInvitationEditorStore(previewDocument());
        store.getState().undo();
        store.getState().redo();
        expect(store.getState().changeCount).toBe(0);
    });

    it('merges edits with the same key that come close together into one step', () => {
        const original = previewDocument();
        const store = createInvitationEditorStore(original);
        store.getState().edit(setColor('#111111'), 'textColor');
        vi.advanceTimersByTime(EDITOR_MERGE_WINDOW_MS - 1);
        store.getState().edit(setColor('#222222'), 'textColor');
        expect(store.getState().past).toHaveLength(1);

        store.getState().undo();
        expect(store.getState().document.overrides).toEqual(original.overrides);
    });

    it('keeps edits apart when they come later or have another key', () => {
        const store = createInvitationEditorStore(previewDocument());
        store.getState().edit(setColor('#111111'), 'textColor');
        vi.advanceTimersByTime(EDITOR_MERGE_WINDOW_MS);
        store.getState().edit(setColor('#222222'), 'textColor');
        store.getState().edit(setColor('#333333'));
        expect(store.getState().past).toHaveLength(3);

        store.getState().undo();
        store.getState().undo();
        expect(store.getState().document.overrides.textColor).toBe('#111111');
    });

    it('keeps a slow drag as one step, however long it takes', () => {
        const original = previewDocument();
        const store = createInvitationEditorStore(original);
        store.getState().edit(setColor('#111111'), 'drag-1', { gesture: true });
        vi.advanceTimersByTime(EDITOR_MERGE_WINDOW_MS * 5);
        store.getState().edit(setColor('#222222'), 'drag-1', { gesture: true });
        expect(store.getState().past).toHaveLength(1);

        // The next drag is a step of its own.
        store.getState().edit(setColor('#333333'), 'drag-2', { gesture: true });
        expect(store.getState().past).toHaveLength(2);
        store.getState().undo();
        store.getState().undo();
        expect(store.getState().document.overrides).toEqual(original.overrides);
    });

    it('never merges into a step that was undone and redone', () => {
        const store = createInvitationEditorStore(previewDocument());
        store.getState().edit(setColor('#111111'), 'textColor');
        store.getState().undo();
        store.getState().redo();
        store.getState().edit(setColor('#222222'), 'textColor');
        expect(store.getState().past).toHaveLength(2);
    });

    it(`keeps the last ${EDITOR_HISTORY_LIMIT} steps`, () => {
        const store = createInvitationEditorStore(previewDocument());
        for (let index = 0; index < EDITOR_HISTORY_LIMIT + 5; index += 1) {
            store.getState().edit(setColor(`#0000${String(index).padStart(2, '0')}`));
        }
        expect(store.getState().past).toHaveLength(EDITOR_HISTORY_LIMIT);
    });

    it('switches theme in one undo step, even to a theme with the same document', () => {
        const store = createInvitationEditorStore(previewDocument(), 'olive');
        const before = store.getState().document;

        // A copied theme keeps its source's themeId, so the document may not change at all.
        store.getState().switchTheme('olive-copy', () => {});
        expect(store.getState()).toMatchObject({ themeSlug: 'olive-copy', document: before, changeCount: 1 });
        expect(store.getState().past).toHaveLength(1);

        store.getState().edit(setColor('#111111'), 'textColor');
        store.getState().undo();
        store.getState().undo();
        expect(store.getState().themeSlug).toBe('olive');
        store.getState().redo();
        expect(store.getState().themeSlug).toBe('olive-copy');
        store.getState().redo();
        expect(store.getState()).toMatchObject({ themeSlug: 'olive-copy', document: { overrides: { textColor: '#111111' } } });
    });

    it('does nothing when switching to the theme it is in', () => {
        const store = createInvitationEditorStore(previewDocument(), 'olive');
        store.getState().switchTheme('olive', setColor('#111111'));
        expect(store.getState()).toMatchObject({ themeSlug: 'olive', past: [], changeCount: 0 });
    });
});
