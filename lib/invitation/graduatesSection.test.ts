import { describe, expect, it } from 'vitest';

import { graduateHasContent } from '@/lib/invitation/listContent';
import { EDITABLE_LISTS } from '@/lib/invitation/listEdits';
import { uniqueListItemIds } from '@/lib/invitation/listIds';
import { createSection } from '@/lib/invitation/newSection';
import { isPhotoField } from '@/lib/invitation/photoSlots';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import { MULTI_INSTANCE_SECTION_TYPES, SECTION_DATA_SCHEMAS } from '@/lib/invitation/sections';

const graduate = (id: string) => ({ id, name: 'Μαρία', degree: 'Πτυχίο Νομικής', university: 'ΑΠΘ' });

// Spec 2026-11-26-graduation-event-type-design.md §5.
describe('the graduates section', () => {
    const schema = SECTION_DATA_SCHEMAS.graduates;

    it('holds a title and up to ten graduates with a name, degree, university and optional photo', () => {
        expect(schema.safeParse({ title: 'Οι απόφοιτοί μας', graduates: [] }).success).toBe(true);
        expect(schema.safeParse({ title: 't', graduates: Array.from({ length: 10 }, (_, i) => graduate(`g${i}`)) }).success).toBe(true);
        expect(schema.safeParse({ title: 't', graduates: Array.from({ length: 11 }, (_, i) => graduate(`g${i}`)) }).success).toBe(false);
        expect(schema.safeParse({ title: 't', graduates: [{ id: 'g1', name: 'Μαρία', degree: 'Νομική' }] }).success).toBe(false);
        expect(schema.safeParse({ title: 't', graduates: [], desktopColumns: 2 }).success).toBe(false);
        expect(schema.safeParse(SAMPLE_SECTIONS.graduates.data).success).toBe(true);
    });

    it('is one block per event', () => {
        expect(MULTI_INSTANCE_SECTION_TYPES.has('graduates')).toBe(false);
    });

    it('starts titled in Greek with one empty graduate', () => {
        const ids = ['s1', 'g1'];
        const section = createSection('graduates', 'GRADUATION', () => ids.shift()!);
        expect(section).toMatchObject({ id: 's1', type: 'graduates', name: 'Απόφοιτοι' });
        expect(section.data).toEqual({ title: 'Οι απόφοιτοί μας', graduates: [{ id: 'g1', name: '', degree: '', university: '' }] });
    });

    it("keeps each graduate's photo in its own slot", () => {
        expect(isPhotoField('graduates', 'graduates.g1.photo')).toBe(true);
        expect(isPhotoField('graduates', 'graduates.g1.name')).toBe(false);
    });

    it('is an editable list of at most ten, whose repeated ids are made unique', () => {
        expect(EDITABLE_LISTS.graduates).toMatchObject({ type: 'graduates', key: 'graduates', max: 10 });
        expect(EDITABLE_LISTS.graduates.blank('n1')).toEqual({ id: 'n1', name: '', degree: '', university: '' });
        const twice = { ...SAMPLE_SECTIONS.graduates, data: { title: 't', graduates: [graduate('g1'), graduate('g1')] } };
        expect(uniqueListItemIds(twice).data).toMatchObject({ graduates: [{ id: 'g1' }, { id: 'g1-2' }] });
    });

    it('shows guests a graduate with any of its fields or a photo', () => {
        expect(graduateHasContent({ id: 'g', name: '', degree: '', university: '' })).toBe(false);
        expect(graduateHasContent({ id: 'g', name: '', degree: 'Νομική', university: '' })).toBe(true);
        expect(graduateHasContent({ id: 'g', name: '', degree: '', university: '', photo: { source: 'media', mediaId: 'm' } })).toBe(true);
    });
});
