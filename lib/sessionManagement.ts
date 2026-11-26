import type { EventSessionResponseDto, EventTypeConvention } from '@/lib/api/types';

export type ManagedSessionRole = 'main' | 'secondary';
export type ManagedSessionSectionId = 'ceremony-session' | 'venue-session';
// The schedule screen's line under an empty row (SchedulePage.host.sessionManagement).
export type ScheduleRowMissingKey = 'mainMissing' | 'missing' | 'notAdded';

export interface ManagedSessionDefinition {
    role: ManagedSessionRole;
    sectionId: ManagedSessionSectionId;
    // ManagedSessionSection's title and description (SchedulePage.host.sessionManagement).
    titleKey: 'ceremony' | 'venue';
    // The row's title and the created session's title (CreateEventPage).
    defaultTitleKey: string;
    missingKey: ScheduleRowMissingKey;
    canCreate: boolean;
    matches: (session: EventSessionResponseDto) => boolean;
}

// A row the schedule screen suggests (spec 2026-11-26-graduation-event-type-design.md §4.3): tapping
// it opens the editor with the title filled in, and the saved item is an ordinary session.
export interface SuggestedSessionDefinition {
    role: 'suggestion';
    sectionId: 'party-session';
    defaultTitleKey: string;
    missingKey: ScheduleRowMissingKey;
    canCreate: true;
}

export type ScheduleRowDefinition = ManagedSessionDefinition | SuggestedSessionDefinition;

export type ScheduleEditRow = { definition: ScheduleRowDefinition | null; session: EventSessionResponseDto | null };

const MAIN_SESSION: ManagedSessionDefinition = {
    role: 'main',
    sectionId: 'ceremony-session',
    titleKey: 'ceremony',
    defaultTitleKey: 'initialSessions.WEDDING.title',
    missingKey: 'mainMissing',
    // Only restores a missing one: the backend refuses a second (5123) and never deletes it (5122).
    canCreate: true,
    matches: (session) => session.isMain,
};

const SECONDARY_SESSION: ManagedSessionDefinition = {
    role: 'secondary',
    sectionId: 'venue-session',
    titleKey: 'venue',
    defaultTitleKey: 'secondarySessions.WEDDING.title',
    missingKey: 'missing',
    canCreate: true,
    matches: (session) => session.isSecondary,
};

const SESSION_MANAGEMENT_BY_EVENT_TYPE: Partial<Record<EventTypeConvention, ManagedSessionDefinition[]>> = {
    WEDDING: [MAIN_SESSION, SECONDARY_SESSION],
    BAPTISM: [
        { ...MAIN_SESSION, defaultTitleKey: 'initialSessions.BAPTISM.title' },
        { ...SECONDARY_SESSION, defaultTitleKey: 'secondarySessions.BAPTISM.title' },
    ],
    GRADUATION: [
        { ...MAIN_SESSION, defaultTitleKey: 'initialSessions.GRADUATION.title', missingKey: 'notAdded' },
        { ...SECONDARY_SESSION, defaultTitleKey: 'secondarySessions.GRADUATION.title', missingKey: 'notAdded' },
    ],
};

const SUGGESTIONS_BY_EVENT_TYPE: Partial<Record<EventTypeConvention, SuggestedSessionDefinition[]>> = {
    GRADUATION: [
        {
            role: 'suggestion',
            sectionId: 'party-session',
            defaultTitleKey: 'suggestedSessions.GRADUATION.title',
            missingKey: 'notAdded',
            canCreate: true,
        },
    ],
};

export function getManagedSessionDefinitions(eventType: EventTypeConvention): ManagedSessionDefinition[] {
    return SESSION_MANAGEMENT_BY_EVENT_TYPE[eventType] ?? [];
}

export function getScheduleSuggestions(eventType: EventTypeConvention): SuggestedSessionDefinition[] {
    return SUGGESTIONS_BY_EVENT_TYPE[eventType] ?? [];
}

// The schedule screen's edit rows: the type's slots, filled or not; its suggestions while the event has
// nothing but those slots, so a host who arranged something else never sees one; then every other item.
export function scheduleEditRows(eventType: EventTypeConvention, sessions: EventSessionResponseDto[]): ScheduleEditRow[] {
    const managed = getManagedSessionDefinitions(eventType).map((definition) => ({
        definition,
        session: sessions.find(definition.matches) ?? null,
    }));
    const managedIds = new Set(managed.map((row) => row.session?.id).filter(Boolean));
    const others = sessions.filter((session) => !managedIds.has(session.id));
    const suggestions = others.length === 0 ? getScheduleSuggestions(eventType).map((definition) => ({ definition, session: null })) : [];
    return [...managed, ...suggestions, ...others.map((session) => ({ definition: null, session }))];
}
