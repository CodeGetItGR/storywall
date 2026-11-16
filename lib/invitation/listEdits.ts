import { arrayMove } from '@dnd-kit/sortable';
import type { Draft } from 'immer';

import type { InvitationSection, SectionType } from '@/lib/invitation/sections';
import { type DocumentRecipe, editSection, type SectionData } from '@/lib/invitation/sectionSettings';

// The lists a host edits row by row in the section settings (old list panels): each
// lives under one key of its section's data and holds items with an id of their own.
type ListOf<T extends SectionType, K extends keyof SectionData<T>> = { type: T; key: K; max: number; blank: (id: string) => Item<T, K> };
type Item<T extends SectionType, K extends keyof SectionData<T>> = SectionData<T>[K] extends readonly (infer I)[] ? I : never;

export const EDITABLE_LISTS = {
    faq: { type: 'faq', key: 'items', max: 50, blank: (id) => ({ id, question: '', answer: '' }) } satisfies ListOf<'faq', 'items'>,
    stays: {
        type: 'accommodation',
        key: 'items',
        max: 30,
        blank: (id) => ({ id, name: '', address: '', phone: '', email: '', website: '', mapUrl: '' }),
    } satisfies ListOf<'accommodation', 'items'>,
    godparents: { type: 'godparents', key: 'godparents', max: 20, blank: (id) => ({ id, name: '' }) } satisfies ListOf<'godparents', 'godparents'>,
    sponsors: { type: 'weddingSponsors', key: 'sponsors', max: 20, blank: (id) => ({ id, name: '' }) } satisfies ListOf<'weddingSponsors', 'sponsors'>,
    parentsGodparents: { type: 'parentsSimple', key: 'godparents', max: 20, blank: (id) => ({ id, name: '' }) } satisfies ListOf<
        'parentsSimple',
        'godparents'
    >,
} as const;

export type EditableList = keyof typeof EDITABLE_LISTS;
export type ListItem<L extends EditableList> = ReturnType<(typeof EDITABLE_LISTS)[L]['blank']>;
export type ListItemPatch<L extends EditableList> = Partial<Omit<ListItem<L>, 'id'>>;

// The people list of a section, for the sections that hold one.
export const PEOPLE_LISTS: Partial<Record<SectionType, EditableList>> = {
    godparents: 'godparents',
    weddingSponsors: 'sponsors',
    parentsSimple: 'parentsGodparents',
};

// The items of one list in a section, or null when the section isn't of the list's type.
export function listItems<L extends EditableList>(section: InvitationSection, list: L): readonly ListItem<L>[] | null {
    const { type, key } = EDITABLE_LISTS[list];
    if (section.type !== type) return null;
    return (section.data as unknown as Record<string, ListItem<L>[]>)[key];
}

function editList(sectionId: string, list: EditableList, change: (items: Draft<{ id: string }>[], section: Draft<InvitationSection>) => void): DocumentRecipe {
    const { type, key } = EDITABLE_LISTS[list];
    return editSection(sectionId, (section) => {
        if (section.type === type) change((section.data as unknown as Record<string, Draft<{ id: string }>[]>)[key], section);
    });
}

// A new empty item at the end; `itemId` is made by the caller so it can be opened next.
export function addListItem(sectionId: string, list: EditableList, itemId: string): DocumentRecipe {
    const { max, blank } = EDITABLE_LISTS[list];
    return editList(sectionId, list, (items) => {
        if (items.length < max) items.push(blank(itemId));
    });
}

export function updateListItem<L extends EditableList>(sectionId: string, list: L, itemId: string, patch: ListItemPatch<L>): DocumentRecipe {
    return editList(sectionId, list, (items) => {
        const item = items.find((entry) => entry.id === itemId);
        if (item) Object.assign(item, patch);
    });
}

// Removes an item and the text styles kept under it.
export function deleteListItem(sectionId: string, list: EditableList, itemId: string): DocumentRecipe {
    const prefix = `${EDITABLE_LISTS[list].key}.${itemId}.`;
    return editList(sectionId, list, (items, section) => {
        const index = items.findIndex((item) => item.id === itemId);
        if (index === -1) return;
        items.splice(index, 1);
        for (const path of Object.keys(section.textStyles)) {
            if (path.startsWith(prefix)) delete section.textStyles[path];
        }
    });
}

// Moves an item to where another one is, as a drag drops it.
export function moveListItem(sectionId: string, list: EditableList, itemId: string, overId: string): DocumentRecipe {
    const { type, key } = EDITABLE_LISTS[list];
    return editSection(sectionId, (section) => {
        if (section.type !== type) return;
        const data = section.data as unknown as Record<string, Draft<{ id: string }>[]>;
        const from = data[key].findIndex((item) => item.id === itemId);
        const to = data[key].findIndex((item) => item.id === overId);
        if (from === -1 || to === -1 || from === to) return;
        data[key] = arrayMove(data[key], from, to);
    });
}

export function canAddListItem(section: InvitationSection, list: EditableList): boolean {
    const items = listItems(section, list);
    return items !== null && items.length < EDITABLE_LISTS[list].max;
}
