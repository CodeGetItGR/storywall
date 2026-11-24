import type { SectionType } from '@/lib/invitation/sections';

// A section's name key under InvitationEditor. The schedule is named after the event (spec item 14, 2026-11-23):
// "Wedding schedule", "Baptism schedule", and "Event schedule" for every other type.
const PROGRAM_BY_EVENT_TYPE: Record<string, 'programWedding' | 'programBaptism'> = {
    WEDDING: 'programWedding',
    BAPTISM: 'programBaptism',
};

// Boy or Girl and a module block have no name of their own: they go by their module's (hooks/useFeedSectionName).
export type NamedSectionType = Exclude<SectionType, 'feedHeOrShe' | 'feedModule'>;
export type SectionNameKey = `sectionNames.${NamedSectionType | 'programWedding' | 'programBaptism'}`;

export function hasSectionName(type: SectionType): type is NamedSectionType {
    return type !== 'feedHeOrShe' && type !== 'feedModule';
}

export function sectionNameKey(type: NamedSectionType, eventType: string | null | undefined): SectionNameKey {
    const program = type === 'program' && eventType ? PROGRAM_BY_EVENT_TYPE[eventType] : undefined;
    return `sectionNames.${program ?? type}`;
}

// A section's name in the invitation editor, which holds no Boy or Girl or module block.
export function sectionName(t: (key: SectionNameKey) => string, type: SectionType, eventType: string | null | undefined): string {
    return hasSectionName(type) ? t(sectionNameKey(type, eventType)) : '';
}
