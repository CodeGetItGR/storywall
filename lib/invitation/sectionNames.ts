import type { SectionType } from '@/lib/invitation/sections';

// A section's name key under InvitationEditor. The schedule is named after the event (spec item 14, 2026-11-23):
// "Wedding schedule", "Baptism schedule", and "Event schedule" for every other type.
const PROGRAM_BY_EVENT_TYPE: Record<string, 'programWedding' | 'programBaptism'> = {
    WEDDING: 'programWedding',
    BAPTISM: 'programBaptism',
};

export type SectionNameKey = `sectionNames.${SectionType | 'programWedding' | 'programBaptism'}`;

export function sectionNameKey(type: SectionType, eventType: string | null | undefined): SectionNameKey {
    const program = type === 'program' && eventType ? PROGRAM_BY_EVENT_TYPE[eventType] : undefined;
    return `sectionNames.${program ?? type}`;
}
