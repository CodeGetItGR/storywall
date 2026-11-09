import { describe, expect, it } from 'vitest';

import type { InvitationDocument } from '@/lib/invitation/document';
import { MAX_SECTIONS } from '@/lib/invitation/document';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { createSection } from '@/lib/invitation/newSection';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import {
    canAddAfter,
    canAddBefore,
    canMoveSection,
    deleteSection,
    draggedOrder,
    insertSection,
    moveSection,
    reorderSections,
    sectionControls,
    sectionToFocusAfterDelete,
    setSectionVisible,
} from '@/lib/invitation/sectionActions';

// top, date, rsvp, then the locked footer.
function sampleDocument(): InvitationDocument {
    return {
        schemaVersion: 1,
        themeId: 't1',
        overrides: {},
        sections: [SAMPLE_SECTIONS.top, SAMPLE_SECTIONS.date, SAMPLE_SECTIONS.rsvp, SAMPLE_SECTIONS.footer],
    };
}

const ids = (document: InvitationDocument) => document.sections.map((section) => section.id);

function storeWithSample() {
    return createInvitationEditorStore(sampleDocument());
}

describe('section rules', () => {
    const sections = sampleDocument().sections;

    it('moves only between unlocked sections', () => {
        expect(canMoveSection(sections, 's-top', -1)).toBe(false);
        expect(canMoveSection(sections, 's-top', 1)).toBe(true);
        expect(canMoveSection(sections, 's-rsvp', 1)).toBe(false);
        expect(canMoveSection(sections, 's-footer', -1)).toBe(false);
        expect(canMoveSection(sections, 'missing', 1)).toBe(false);
    });

    it('adds after every section but the last', () => {
        expect(canAddAfter(sections, 's-rsvp')).toBe(true);
        expect(canAddAfter(sections, 's-footer')).toBe(false);
        expect(canAddAfter(sections, 'missing')).toBe(false);
    });

    it('adds above the first section only', () => {
        expect(canAddBefore(sections, 's-top')).toBe(true);
        expect(canAddBefore(sections, 's-date')).toBe(false);
        expect(canAddBefore(sections, 'missing')).toBe(false);
        expect(canAddBefore([], 's-top')).toBe(false);
    });

    it('keeps a "+" on a page down to its footer', () => {
        const [footer] = sectionControls({ ...sampleDocument(), sections: [SAMPLE_SECTIONS.footer] });
        expect(footer).toMatchObject({ canAddBefore: true, canAddAfter: false, canMoveUp: false, canMoveDown: false });
    });

    it('moves focus after a delete to the next section with tools, else the one before', () => {
        expect(sectionToFocusAfterDelete(sections, 's-date')).toBe('s-rsvp');
        // Below rsvp there is only the footer, so focus goes up.
        expect(sectionToFocusAfterDelete(sections, 's-rsvp')).toBe('s-date');
        // With no other section that has tools, the footer takes it.
        expect(sectionToFocusAfterDelete([SAMPLE_SECTIONS.top, SAMPLE_SECTIONS.footer], 's-top')).toBe('s-footer');
        expect(sectionToFocusAfterDelete(sections, 'missing')).toBeNull();
    });

    it('drags into place but never past a locked section', () => {
        expect(draggedOrder(sections, 's-rsvp', 's-top')).toEqual(['s-rsvp', 's-top', 's-date', 's-footer']);
        expect(draggedOrder(sections, 's-top', 's-rsvp')).toEqual(['s-date', 's-rsvp', 's-top', 's-footer']);
        expect(draggedOrder(sections, 's-top', 's-footer')).toBeNull();
        expect(draggedOrder(sections, 's-footer', 's-top')).toBeNull();
        expect(draggedOrder(sections, 's-top', 's-top')).toBeNull();
    });
});

describe('section edits through the editor store', () => {
    it('adds a section right after the one picked, as one undo step', () => {
        const store = storeWithSample();
        const added = createSection('faq', 'WEDDING');
        store.getState().edit(insertSection({ id: 's-date', place: 'after' }, added));
        expect(ids(store.getState().document)).toEqual(['s-top', 's-date', added.id, 's-rsvp', 's-footer']);

        store.getState().undo();
        expect(ids(store.getState().document)).toEqual(['s-top', 's-date', 's-rsvp', 's-footer']);
        store.getState().redo();
        expect(store.getState().document.sections[2]).toEqual(added);
    });

    it('never adds after the footer, or above anything but the first section', () => {
        const store = storeWithSample();
        store.getState().edit(insertSection({ id: 's-footer', place: 'after' }, createSection('faq', 'WEDDING')));
        store.getState().edit(insertSection({ id: 's-date', place: 'before' }, createSection('faq', 'WEDDING')));
        expect(store.getState().past).toHaveLength(0);
    });

    it('adds above the footer once every other section is gone', () => {
        const store = createInvitationEditorStore({ ...sampleDocument(), sections: [SAMPLE_SECTIONS.footer] });
        const added = createSection('faq', 'WEDDING');
        store.getState().edit(insertSection({ id: 's-footer', place: 'before' }, added));
        expect(ids(store.getState().document)).toEqual([added.id, 's-footer']);
    });

    it('stops adding at the section limit', () => {
        const blanks = Array.from({ length: MAX_SECTIONS - 1 }, () => createSection('blank', 'WEDDING'));
        const store = createInvitationEditorStore({ ...sampleDocument(), sections: [...blanks, SAMPLE_SECTIONS.footer] });
        store.getState().edit(insertSection({ id: blanks[0].id, place: 'after' }, createSection('blank', 'WEDDING')));
        expect(store.getState().document.sections).toHaveLength(MAX_SECTIONS);
        expect(store.getState().past).toHaveLength(0);
    });

    it('moves a section up and down and undoes it', () => {
        const store = storeWithSample();
        store.getState().edit(moveSection('s-rsvp', -1));
        expect(ids(store.getState().document)).toEqual(['s-top', 's-rsvp', 's-date', 's-footer']);
        store.getState().edit(moveSection('s-top', 1));
        expect(ids(store.getState().document)).toEqual(['s-rsvp', 's-top', 's-date', 's-footer']);
        store.getState().undo();
        store.getState().undo();
        expect(ids(store.getState().document)).toEqual(['s-top', 's-date', 's-rsvp', 's-footer']);
    });

    it('records nothing for a move that is not allowed', () => {
        const store = storeWithSample();
        store.getState().edit(moveSection('s-rsvp', 1));
        store.getState().edit(moveSection('s-footer', -1));
        expect(store.getState().past).toHaveLength(0);
    });

    it('reorders by drag and undoes it', () => {
        const store = storeWithSample();
        store.getState().edit(reorderSections('s-rsvp', 's-top'));
        expect(ids(store.getState().document)).toEqual(['s-rsvp', 's-top', 's-date', 's-footer']);
        store.getState().edit(reorderSections('s-top', 's-footer'));
        expect(store.getState().past).toHaveLength(1);
        store.getState().undo();
        expect(ids(store.getState().document)).toEqual(['s-top', 's-date', 's-rsvp', 's-footer']);
    });

    it('hides and shows a section, but not the locked footer', () => {
        const store = storeWithSample();
        store.getState().edit(setSectionVisible('s-date', false));
        expect(store.getState().document.sections[1].visible).toBe(false);
        store.getState().edit(setSectionVisible('s-footer', false));
        expect(store.getState().document.sections[3].visible).toBe(true);
        store.getState().undo();
        expect(store.getState().document.sections[1].visible).toBe(true);
    });

    it('deletes a section and brings it back on undo, but keeps the footer', () => {
        const store = storeWithSample();
        store.getState().edit(deleteSection('s-date'));
        expect(ids(store.getState().document)).toEqual(['s-top', 's-rsvp', 's-footer']);
        store.getState().edit(deleteSection('s-footer'));
        expect(ids(store.getState().document)).toEqual(['s-top', 's-rsvp', 's-footer']);
        store.getState().undo();
        expect(store.getState().document).toEqual(sampleDocument());
    });
});
