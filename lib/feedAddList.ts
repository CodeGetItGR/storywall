import type { EventModuleResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { MULTI_INSTANCE_SECTION_TYPES } from '@/lib/invitation/sections';

// What the feed's Add section list offers, per event type, in the owner's order (KAN-293, 2026-11-26). The schedule
// is the Schedule module's tile, never a typed one; Families, the typed schedule and the schedule with icons aren't
// offered. Other section types can't be added from the feed; blocks already on a layout stay.
const BEFORE: readonly NewSectionType[] = ['date', 'countdown', 'locations', 'gallery'];
const AFTER: readonly NewSectionType[] = ['photo', 'blank'];

const WEDDING: readonly NewSectionType[] = [
    'invitation',
    'coupleNames',
    'coupleProfiles',
    'coupleProfilesSimple',
    'parentsSimple',
    'weddingSponsors',
    'weddingSponsorsSimple',
    ...BEFORE,
    'ourStoryProposal',
    'dressCode',
    'faq',
    'accommodation',
    'gift',
    'coupleContact',
    'contact',
    ...AFTER,
];
const BAPTISM: readonly NewSectionType[] = [
    'invitation',
    'baby',
    'parentsPhoto',
    'parentsSimple',
    'godparents',
    ...BEFORE,
    'faq',
    'accommodation',
    'gift',
    'contact',
    ...AFTER,
];
const SHOWER: readonly NewSectionType[] = ['invitation', ...BEFORE, 'faq', 'accommodation', 'gift', 'contact', ...AFTER];
// Birthday, and the types that use its list (social event, private party, reunion): no gift.
const BIRTHDAY: readonly NewSectionType[] = ['invitation', ...BEFORE, 'faq', 'accommodation', 'contact', ...AFTER];

const LISTS: Record<string, readonly NewSectionType[]> = { WEDDING, BAPTISM, BABY_SHOWER: SHOWER, GENDER_REVEAL: SHOWER };

// A module whose Premium tile covers a section: with the module, the section leaves the list (spec item 15).
const COVERED_BY: Partial<Record<NewSectionType, string>> = { gift: 'wishlist' };

// Every type any list holds: these are the Save my date blocks the feed may add.
export const FEED_ADD_TYPES: readonly NewSectionType[] = [...new Set([...WEDDING, ...BAPTISM, ...SHOWER, ...BIRTHDAY])];

export function feedAddList(document: InvitationDocument, eventType: string, modules: readonly EventModuleResponseDto[]): NewSectionType[] {
    if (document.sections.length >= MAX_SECTIONS) return [];
    const used = new Set(document.sections.map((section) => section.type));
    return (LISTS[eventType] ?? BIRTHDAY).filter((type) => {
        const covering = COVERED_BY[type];
        if (covering && isModuleAvailable([...modules], covering)) return false;
        return MULTI_INSTANCE_SECTION_TYPES.has(type) || !used.has(type);
    });
}
