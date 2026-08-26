import type { EventTypeConvention } from '@/lib/api/types';

type CreateEventCatalogEntry = {
    backgroundImageSrc?: string;
    startAtLabelKey: string;
    initialSessionTitleKey?: string;
    // Event types with a second focal session (e.g. a wedding's venue/reception
    // alongside its ceremony). Purely a FE convention — see
    // event-session-secondary-flag-fe-integration.md. Absent for event types
    // with no secondary session concept (e.g. BIRTHDAY).
    secondarySessionTitleKey?: string;
};

const CREATE_EVENT_CATALOG: Partial<Record<EventTypeConvention, CreateEventCatalogEntry>> = {
    WEDDING: {
        backgroundImageSrc: '/images/banner.jpg',
        startAtLabelKey: 'fieldLabels.WEDDING.startAt',
        initialSessionTitleKey: 'initialSessions.WEDDING.title',
        secondarySessionTitleKey: 'secondarySessions.WEDDING.title',
    },
    BAPTISM: {
        backgroundImageSrc: '/images/venue.png',
        startAtLabelKey: 'fieldLabels.BAPTISM.startAt',
        initialSessionTitleKey: 'initialSessions.BAPTISM.title',
        secondarySessionTitleKey: 'secondarySessions.BAPTISM.title',
    },
};

export function getCreateEventCatalogEntry(eventType: EventTypeConvention): CreateEventCatalogEntry | undefined {
    return CREATE_EVENT_CATALOG[eventType];
}
