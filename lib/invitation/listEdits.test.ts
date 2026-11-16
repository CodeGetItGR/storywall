import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import type { InvitationDocument } from '@/lib/invitation/document';
import {
    addListItem,
    canAddListItem,
    deleteListItem,
    EDITABLE_LISTS,
    listItems,
    moveListItem,
    updateListItem,
} from '@/lib/invitation/listEdits';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

function documentWith(...sections: InvitationSection[]): InvitationDocument {
    return { ...SAMPLE_DOCUMENT, sections };
}

const run = (document: InvitationDocument, recipe: (draft: InvitationDocument) => void) => produce(document, recipe);
const at = (document: InvitationDocument, index = 0) => document.sections[index];

describe('list edits', () => {
    const faq = SAMPLE_SECTIONS.faq;

    it('adds an empty item at the end, up to the list limit', () => {
        const next = run(documentWith(faq), addListItem(faq.id, 'faq', 'q2'));
        expect(listItems(at(next), 'faq')).toEqual([...faq.data.items, { id: 'q2', question: '', answer: '' }]);

        const full = documentWith({ ...faq, data: { ...faq.data, items: Array.from({ length: 50 }, (_, index) => ({ id: `q${index}`, question: '', answer: '' })) } });
        expect(canAddListItem(at(full), 'faq')).toBe(false);
        expect(run(full, addListItem(faq.id, 'faq', 'extra'))).toBe(full);
    });

    it('changes one field of one item', () => {
        const next = run(documentWith(faq), updateListItem(faq.id, 'faq', 'q1', { answer: 'Όχι.' }));
        expect(listItems(at(next), 'faq')).toEqual([{ id: 'q1', question: 'Υπάρχει πάρκινγκ;', answer: 'Όχι.' }]);
    });

    it('deletes an item and the text styles kept under it', () => {
        const godparents = { ...SAMPLE_SECTIONS.godparents, textStyles: { 'godparents.g1.name': { italic: true }, godparentsTitle: { bold: true } } };
        const next = run(documentWith(godparents), deleteListItem(godparents.id, 'godparents', 'g1'));
        expect(listItems(at(next), 'godparents')?.map((item) => item.id)).toEqual(['g2']);
        expect(at(next).textStyles).toEqual({ godparentsTitle: { bold: true } });
    });

    it('moves an item to where another one is', () => {
        const stays = {
            ...SAMPLE_SECTIONS.accommodation,
            data: {
                ...SAMPLE_SECTIONS.accommodation.data,
                items: ['a', 'b', 'c'].map((id) => ({ ...EDITABLE_LISTS.stays.blank(id), name: id })),
            },
        };
        const next = run(documentWith(stays), moveListItem(stays.id, 'stays', 'a', 'c'));
        expect(listItems(at(next), 'stays')?.map((item) => item.id)).toEqual(['b', 'c', 'a']);

        const document = documentWith(stays);
        expect(run(document, moveListItem(stays.id, 'stays', 'a', 'gone'))).toBe(document);
    });

    it('leaves a section of another type alone', () => {
        const document = documentWith(SAMPLE_SECTIONS.program);
        expect(listItems(at(document), 'faq')).toBeNull();
        expect(run(document, addListItem(SAMPLE_SECTIONS.program.id, 'faq', 'q2'))).toBe(document);
    });

    it('adds to the sponsors list', () => {
        const next = run(documentWith(SAMPLE_SECTIONS.weddingSponsors), addListItem(SAMPLE_SECTIONS.weddingSponsors.id, 'sponsors', 'k2'));
        expect(listItems(at(next), 'sponsors')).toEqual([{ id: 'k1', name: 'Κώστας' }, { id: 'k2', name: '' }]);
    });
});
