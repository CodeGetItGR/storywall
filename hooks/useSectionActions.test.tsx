import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useStore } from 'zustand';

import { useSectionActions } from '@/hooks/useSectionActions';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { sampleDraftDocument } from '@/lib/invitation/sampleDraft';

// The hook as the editor uses it: the document follows the store.
function renderSectionActions(eventType = 'WEDDING') {
    return renderHook(() => {
        const [store] = useState(() => createInvitationEditorStore(sampleDraftDocument()));
        const document = useStore(store, (state) => state.document);
        return { store, document, actions: useSectionActions(store, document, eventType) };
    });
}

const ids = (result: { current: { document: { sections: { id: string }[] } } }) => result.current.document.sections.map((section) => section.id);

describe('useSectionActions', () => {
    it('gives each section its tools', () => {
        const { result } = renderSectionActions();
        const { controls } = result.current.actions;

        expect(controls[0]).toMatchObject({ canMoveUp: false, canMoveDown: true, canAddAfter: true });
        // The section above the footer can't move past it.
        expect(controls.at(-2)).toMatchObject({ canMoveUp: true, canMoveDown: false, canAddAfter: true });
        expect(controls.at(-1)).toMatchObject({ canMoveUp: false, canMoveDown: false, canAddAfter: false });
    });

    it('adds a section after the "+" and makes it the active one, in one undo step', () => {
        const { result } = renderSectionActions();
        const before = ids(result);

        act(() => result.current.actions.addList.open('s-top'));
        expect(result.current.actions.addList.isOpen).toBe(true);
        expect(result.current.actions.addList.types).toEqual(expect.arrayContaining(['blank', 'photo']));
        expect(result.current.actions.addList.types).not.toContain('photoFrame');
        expect(result.current.actions.addList.types).not.toContain('faq');

        act(() => result.current.actions.addList.add('photo'));
        const added = result.current.document.sections[1];
        expect(added.type).toBe('photo');
        expect(result.current.actions.addList.isOpen).toBe(false);
        expect(result.current.actions.activeId).toBe(added.id);

        act(() => result.current.store.getState().undo());
        expect(ids(result)).toEqual(before);
    });

    it('lets an admin add a framed photo', () => {
        const { result } = renderHook(() => {
            const [store] = useState(() => createInvitationEditorStore(sampleDraftDocument()));
            const document = useStore(store, (state) => state.document);
            return useSectionActions(store, document, 'WEDDING', 'admin');
        });
        expect(result.current.addList.types).toContain('photoFrame');
    });

    it('hides and shows a section', () => {
        const { result } = renderSectionActions();
        const find = () => result.current.document.sections.find((section) => section.id === 's-faq');

        act(() => result.current.actions.toggleVisible('s-faq'));
        expect(find()?.visible).toBe(false);
        act(() => result.current.actions.toggleVisible('s-faq'));
        expect(find()?.visible).toBe(true);
    });

    it('moves and drags sections, never past the footer', () => {
        const { result } = renderSectionActions();

        act(() => result.current.actions.move('s-dressCode', -1));
        expect(ids(result).indexOf('s-dressCode')).toBe(ids(result).indexOf('s-faq') - 1);

        act(() => result.current.actions.reorder('s-top', 's-invitation'));
        expect(ids(result).indexOf('s-top')).toBe(ids(result).indexOf('s-invitation') + 1);

        const before = ids(result);
        act(() => result.current.actions.reorder('s-photoFrame', 's-footer'));
        expect(ids(result)).toEqual(before);
    });

    it('deletes only after a yes', () => {
        const { result } = renderSectionActions();

        act(() => result.current.actions.deleteConfirm.ask('s-footer'));
        expect(result.current.actions.deleteConfirm.isOpen).toBe(false);

        act(() => result.current.actions.deleteConfirm.ask('s-faq'));
        expect(result.current.actions.deleteConfirm).toMatchObject({ isOpen: true, sectionType: 'faq' });
        act(() => result.current.actions.deleteConfirm.cancel());
        expect(result.current.actions.deleteConfirm.isOpen).toBe(false);
        // The name stays while the modal closes.
        expect(result.current.actions.deleteConfirm.sectionType).toBe('faq');
        expect(ids(result)).toContain('s-faq');

        act(() => result.current.actions.deleteConfirm.ask('s-faq'));
        act(() => result.current.actions.deleteConfirm.confirm());
        expect(ids(result)).not.toContain('s-faq');
        expect(result.current.actions.deleteConfirm.isOpen).toBe(false);

        act(() => result.current.store.getState().undo());
        expect(ids(result)).toContain('s-faq');
    });

    it('closes the question when an undo takes the section away', () => {
        const { result } = renderSectionActions();
        act(() => result.current.actions.addList.open('s-top'));
        act(() => result.current.actions.addList.add('blank'));
        const added = result.current.document.sections[1].id;

        act(() => result.current.actions.deleteConfirm.ask(added));
        expect(result.current.actions.deleteConfirm.isOpen).toBe(true);
        act(() => result.current.store.getState().undo());
        expect(result.current.actions.deleteConfirm.isOpen).toBe(false);
    });
});
