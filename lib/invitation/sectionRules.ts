import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { MULTI_INSTANCE_SECTION_TYPES, SECTION_TYPES, type SectionType } from '@/lib/invitation/sections';

// Who is editing: hosts edit their own copy, admins design themes.
export type EditorMode = 'host' | 'admin';

type EventSections = { default: readonly SectionType[]; optional: readonly SectionType[] };

const WEDDING: EventSections = {
    default: ['top', 'invitation', 'date', 'countdown', 'locations', 'rsvp', 'gallery', 'contact', 'footer'],
    optional: [
        'parents', 'gift', 'accommodation', 'program', 'programIcons', 'faq', 'blank', 'photo', 'photoFrame', 'coupleNames',
        'ourStoryProposal', 'dressCode', 'coupleContact', 'weddingSponsors', 'coupleProfiles', 'coupleProfilesSimple',
        'weddingSponsorsSimple',
    ],
};

const BAPTISM: EventSections = {
    default: ['top', 'baby', 'parentsPhoto', 'godparents', 'invitation', 'date', 'countdown', 'locations', 'rsvp', 'gift', 'contact', 'footer'],
    optional: ['parentsSimple', 'gallery', 'accommodation', 'program', 'programIcons', 'faq', 'blank', 'photo', 'photoFrame'],
};

const BIRTHDAY: EventSections = {
    default: ['top', 'invitation', 'date', 'countdown', 'gallery', 'contact', 'footer'],
    optional: ['locations', 'rsvp', 'accommodation', 'program', 'programIcons', 'faq', 'blank', 'photo', 'photoFrame'],
};

// The sections each event type may use, from the old editor's lists (Γάμος,
// Βάπτιση, Γενέθλια, Baby Shower, Gender Reveal). Event types the old app
// didn't have use the birthday list.
export const EVENT_TYPE_SECTIONS: Record<string, EventSections> = {
    WEDDING,
    BAPTISM,
    BIRTHDAY,
    BABY_SHOWER: {
        default: ['top', 'invitation', 'date', 'gift', 'gallery', 'contact', 'footer'],
        optional: ['locations', 'rsvp', 'countdown', 'accommodation', 'program', 'programIcons', 'faq', 'blank', 'photo', 'photoFrame'],
    },
    GENDER_REVEAL: {
        default: ['top', 'invitation', 'date', 'countdown', 'gallery', 'contact', 'footer'],
        optional: ['locations', 'rsvp', 'gift', 'accommodation', 'program', 'programIcons', 'faq', 'blank', 'photo', 'photoFrame'],
    },
    SOCIAL_EVENT: BIRTHDAY,
    PRIVATE_PARTY: BIRTHDAY,
    REUNION: BIRTHDAY,
};

// Never in the add list: the footer comes with the theme.
const NOT_ADDABLE: ReadonlySet<SectionType> = new Set(['footer']);

// Only admins may add these.
const ADMIN_ONLY: ReadonlySet<SectionType> = new Set(['photoFrame']);

export function sectionsForEventType(eventType: string): EventSections {
    return EVENT_TYPE_SECTIONS[eventType] ?? BIRTHDAY;
}

// What the add list offers, in the old editor's order. A section that may
// appear once drops out while it is on the page, and nothing is offered once
// the page has as many sections as a document may hold.
export function addableSectionTypes(document: InvitationDocument, eventType: string, mode: EditorMode): NewSectionType[] {
    if (document.sections.length >= MAX_SECTIONS) return [];
    const { default: defaults, optional } = sectionsForEventType(eventType);
    const allowed = new Set([...defaults, ...optional]);
    const used = new Set(document.sections.map((section) => section.type));
    return SECTION_TYPES.filter(
        (type): type is NewSectionType =>
            allowed.has(type) &&
            !NOT_ADDABLE.has(type) &&
            (mode === 'admin' || !ADMIN_ONLY.has(type)) &&
            (MULTI_INSTANCE_SECTION_TYPES.has(type) || !used.has(type)),
    );
}
