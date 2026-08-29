import type { EventSessionResponseDto, EventTypeConvention } from '@/lib/api/types';

export type ManagedSessionRole = 'main' | 'secondary';
export type ManagedSessionSectionId = 'ceremony-session' | 'venue-session';

export interface ManagedSessionDefinition {
    role: ManagedSessionRole;
    sectionId: ManagedSessionSectionId;
    titleKey: 'ceremony' | 'venue';
    defaultTitleKey: string;
    canCreate: boolean;
    matches: (session: EventSessionResponseDto) => boolean;
}

const MAIN_SESSION: ManagedSessionDefinition = {
    role: 'main',
    sectionId: 'ceremony-session',
    titleKey: 'ceremony',
    defaultTitleKey: 'initialSessions.WEDDING.title',
    canCreate: false,
    matches: (session) => session.isMain,
};

const SECONDARY_SESSION: ManagedSessionDefinition = {
    role: 'secondary',
    sectionId: 'venue-session',
    titleKey: 'venue',
    defaultTitleKey: 'secondarySessions.WEDDING.title',
    canCreate: true,
    matches: (session) => session.isSecondary,
};

const SESSION_MANAGEMENT_BY_EVENT_TYPE: Partial<Record<EventTypeConvention, ManagedSessionDefinition[]>> = {
    WEDDING: [MAIN_SESSION, SECONDARY_SESSION],
    BAPTISM: [
        { ...MAIN_SESSION, defaultTitleKey: 'initialSessions.BAPTISM.title' },
        { ...SECONDARY_SESSION, defaultTitleKey: 'secondarySessions.BAPTISM.title' },
    ],
};

export function getManagedSessionDefinitions(eventType: EventTypeConvention): ManagedSessionDefinition[] {
    return SESSION_MANAGEMENT_BY_EVENT_TYPE[eventType] ?? [];
}
