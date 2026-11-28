import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationSection, SectionType } from '@/lib/invitation/sections';

// The field of each section type that holds a list of items with ids.
const LIST_FIELDS: Partial<Record<SectionType, string>> = {
    faq: 'items',
    accommodation: 'items',
    program: 'items',
    programIcons: 'items',
    godparents: 'godparents',
    weddingSponsors: 'sponsors',
    graduates: 'graduates',
    parentsSimple: 'godparents',
};

type Item = { id: string };

// Old invitations can repeat an item's id within a list. Each repeat gets an id of its own
// (`id-2`, `id-3`…), so rows, drags and deletes act on one item, not every copy.
export function uniqueListItemIds(section: InvitationSection): InvitationSection {
    const field = LIST_FIELDS[section.type];
    const items = field ? ((section.data as Record<string, unknown>)[field] as Item[] | undefined) : undefined;
    if (!field || !items) return section;

    const seen = new Set<string>();
    let changed = false;
    const unique = items.map((item) => {
        let id = item.id;
        for (let n = 2; seen.has(id); n += 1) id = `${item.id}-${n}`;
        seen.add(id);
        if (id === item.id) return item;
        changed = true;
        return { ...item, id };
    });
    return changed ? ({ ...section, data: { ...section.data, [field]: unique } } as InvitationSection) : section;
}

export function withUniqueListItemIds(document: InvitationDocument): InvitationDocument {
    const sections = document.sections.map(uniqueListItemIds);
    return sections.every((section, index) => section === document.sections[index]) ? document : { ...document, sections };
}

// A new element's id, as newSectionId (lib/invitation/newSection.ts).
export const newElementId = () => crypto.randomUUID();
