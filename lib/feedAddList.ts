import type { EventModuleResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { MULTI_INSTANCE_SECTION_TYPES } from '@/lib/invitation/sections';

// What the feed's Add section list offers, per event type, in the owner's order (spec item 13, 2026-11-23). Other
// section types can't be added from the feed any more; blocks already on a layout stay.
const WEDDING: readonly NewSectionType[] = [
    'invitation',
    'coupleProfiles',
    'parents',
    'weddingSponsors',
    'gallery',
    'ourStoryProposal',
    'program',
    'dressCode',
    'faq',
    'accommodation',
    'gift',
    'contact',
];
const BAPTISM: readonly NewSectionType[] = ['invitation', 'baby', 'parentsPhoto', 'godparents', 'gallery', 'program', 'faq', 'accommodation', 'gift', 'contact'];
const SHOWER: readonly NewSectionType[] = ['invitation', 'gallery', 'program', 'faq', 'accommodation', 'gift', 'contact'];
const OTHER: readonly NewSectionType[] = ['invitation', 'gallery', 'program', 'faq', 'accommodation', 'contact'];

const LISTS: Record<string, readonly NewSectionType[]> = { WEDDING, BAPTISM, BABY_SHOWER: SHOWER, GENDER_REVEAL: SHOWER };

// A module whose Premium tile covers a section: with the module, the section leaves the list (spec item 15).
const COVERED_BY: Partial<Record<NewSectionType, string>> = { program: 'schedule', gift: 'wishlist' };

// Every type any list holds: these are the Save my date blocks the feed may add.
export const FEED_ADD_TYPES: readonly NewSectionType[] = [...new Set([...WEDDING, ...BAPTISM, ...SHOWER, ...OTHER])];

export function feedAddList(document: InvitationDocument, eventType: string, modules: readonly EventModuleResponseDto[]): NewSectionType[] {
    if (document.sections.length >= MAX_SECTIONS) return [];
    const used = new Set(document.sections.map((section) => section.type));
    return (LISTS[eventType] ?? OTHER).filter((type) => {
        const covering = COVERED_BY[type];
        if (covering && isModuleAvailable([...modules], covering)) return false;
        return MULTI_INSTANCE_SECTION_TYPES.has(type) || !used.has(type);
    });
}
