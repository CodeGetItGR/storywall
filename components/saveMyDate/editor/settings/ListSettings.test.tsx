import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { produce } from 'immer';
import { NextIntlClientProvider } from 'next-intl';
import { type ReactNode, useCallback, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FaqItemsSettings } from '@/components/saveMyDate/editor/settings/FaqItemsSettings';
import { PeopleSettings } from '@/components/saveMyDate/editor/settings/PeopleSettings';
import { StaysSettings } from '@/components/saveMyDate/editor/settings/StaysSettings';
import { useListDrag } from '@/hooks/useListDrag';
import type { PeopleSection } from '@/hooks/usePeopleSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { InvitationDocument } from '@/lib/invitation/document';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { DocumentRecipe } from '@/lib/invitation/sectionSettings';
import en from '@/messages/en.json';

const copy = en.InvitationEditor.sectionSettings;
let latest: InvitationDocument;

// One section's settings over a live copy of it: each edit redraws them, as in the editor.
function Harness({ initial, children }: { initial: InvitationDocument; children: (scope: SettingsScope) => ReactNode }) {
    const [document, setDocument] = useState(initial);
    const edit = useCallback(
        (recipe: DocumentRecipe) =>
            setDocument((current) => {
                latest = produce(current, recipe);
                return latest;
            }),
        [],
    );
    const scope: SettingsScope = {
        section: document.sections[0],
        edit,
        mode: 'host',
        isAdmin: false,
        theme: SAMPLE_THEME,
        media: (id) => `/media/${id}.jpg`,
        fonts: [],
        draftId: 'draft-1',
        addUploaded: vi.fn(),
    };
    return children(scope);
}

function renderSettings(initial: InvitationSection, children: (scope: SettingsScope) => ReactNode) {
    latest = { ...SAMPLE_DOCUMENT, sections: [initial] };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <Harness initial={latest}>{children}</Harness>
        </NextIntlClientProvider>,
    );
}

const items = () => latest.sections[0].data as Record<string, unknown>;

function type(label: string, value: string) {
    const field = screen.getByLabelText(label);
    fireEvent.change(field, { target: { value } });
    fireEvent.blur(field);
}

afterEach(cleanup);

describe('FaqItemsSettings', () => {
    const faq = () => renderSettings(SAMPLE_SECTIONS.faq, (scope) => <FaqItemsSettings scope={scope as SettingsScope<SectionOf<'faq'>>} />);

    it('lists the questions, each with a handle to move it', () => {
        faq();
        expect(screen.getByRole('heading', { name: copy.questions })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Υπάρχει πάρκινγκ;' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.reorder })).toBeInTheDocument();
    });

    it('adds a question, opens it, and keeps what is typed', () => {
        faq();
        fireEvent.click(screen.getByRole('button', { name: copy.addQuestion }));
        const form = screen.getByRole('group', { name: copy.untitled });

        type(copy.question, 'Τι ώρα;');
        type(copy.answer, 'Στις 6.');
        expect(within(form).getByRole('heading', { name: 'Τι ώρα;' })).toBeInTheDocument();
        fireEvent.click(within(form).getByRole('button', { name: copy.done }));

        expect(screen.getByRole('button', { name: 'Τι ώρα;' })).toBeInTheDocument();
        expect(items().items).toEqual([expect.objectContaining({ id: 'q1' }), expect.objectContaining({ question: 'Τι ώρα;', answer: 'Στις 6.' })]);
    });

    it('deletes a question from its own settings', () => {
        faq();
        fireEvent.click(screen.getByRole('button', { name: 'Υπάρχει πάρκινγκ;' }));
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.delete }));
        expect(items().items).toEqual([]);
        expect(screen.getByRole('button', { name: copy.addQuestion })).toBeInTheDocument();
    });
});

describe('PeopleSettings', () => {
    const people = (section: PeopleSection) => renderSettings(section, (scope) => <PeopleSettings scope={scope as SettingsScope<PeopleSection>} />);

    it('names the godparents list and adds a godparent', () => {
        people(SAMPLE_SECTIONS.godparents);
        expect(screen.getByRole('heading', { name: en.InvitationEditor.sectionNames.godparents })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: copy.reorder })).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: copy.addGodparent }));
        type(copy.name, 'Μαρία');
        expect(items().godparents).toEqual([expect.objectContaining({ id: 'g1' }), expect.objectContaining({ id: 'g2' }), expect.objectContaining({ name: 'Μαρία' })]);
    });

    it('edits the godparents of the section without photos', () => {
        people(SAMPLE_SECTIONS.parentsSimple);
        fireEvent.click(screen.getByRole('button', { name: 'Γιώργος' }));
        type(copy.name, 'Γιάννης');
        expect(items().godparents).toEqual([{ id: 'g1', name: 'Γιάννης' }]);
    });

    it('adds and deletes a wedding sponsor', () => {
        people(SAMPLE_SECTIONS.weddingSponsors);
        expect(screen.getByRole('heading', { name: en.InvitationEditor.sectionNames.weddingSponsors })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: copy.addSponsor }));
        expect(items().sponsors).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.delete }));
        expect(items().sponsors).toEqual([{ id: 'k1', name: 'Κώστας' }]);
    });
});

describe('StaysSettings', () => {
    const stays = (section: SectionOf<'accommodation'> = SAMPLE_SECTIONS.accommodation) =>
        renderSettings(section, (scope) => <StaysSettings scope={scope as SettingsScope<SectionOf<'accommodation'>>} />);

    it('edits a place to stay, its details and its links', () => {
        stays();
        fireEvent.click(screen.getByRole('button', { name: 'Ξενοδοχείο' }));
        type(copy.name, 'Βίλα');
        type(copy.address, 'Λίνδος');
        type(copy.contactLinks.phone, '2241000000');
        type(copy.contactLinks.email, 'info@vila.gr');
        expect(items().items).toEqual([expect.objectContaining({ name: 'Βίλα', address: 'Λίνδος', phone: '2241000000', email: 'info@vila.gr' })]);
    });

    it('adds a place to stay to an empty list', () => {
        stays({ ...SAMPLE_SECTIONS.accommodation, data: { ...SAMPLE_SECTIONS.accommodation.data, items: [] } });
        fireEvent.click(screen.getByRole('button', { name: copy.addStay }));
        expect(screen.getByRole('group', { name: copy.stays })).toBeInTheDocument();
        expect(items().items).toHaveLength(1);
    });
});

describe('useListDrag', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale="en" messages={en}>
            {children}
        </NextIntlClientProvider>
    );
    const row = (name: string, index?: number) => ({ id: name, data: { current: { name, sortable: index === undefined ? undefined : { index } } } });

    it('names the row being moved and its place', () => {
        const { result } = renderHook(() => useListDrag(3, vi.fn()), { wrapper });
        const { announcements, screenReaderInstructions } = result.current.accessibility;
        expect(screenReaderInstructions.draggable).toBe(copy.listDrag.instructions);
        const active = row('Νονός') as never;

        expect(announcements.onDragStart({ active })).toBe('Picked up Νονός.');
        expect(announcements.onDragOver({ active, over: row('Άλλος', 1) as never })).toBe('Νονός is at place 2 of 3.');
        expect(announcements.onDragEnd({ active, over: row('Άλλος', 2) as never })).toBe('Dropped Νονός at place 3 of 3.');
        expect(announcements.onDragCancel({ active, over: null })).toBe('Νονός is back where it was.');
    });

    it('reorders only when dropped on another row', () => {
        const onReorder = vi.fn();
        const { result } = renderHook(() => useListDrag(2, onReorder), { wrapper });
        act(() => result.current.onDragEnd({ active: { id: 'a' }, over: { id: 'a' } } as never));
        act(() => result.current.onDragEnd({ active: { id: 'a' }, over: { id: 'b' } } as never));
        expect(onReorder).toHaveBeenCalledOnce();
        expect(onReorder).toHaveBeenCalledWith('a', 'b');
    });
});
