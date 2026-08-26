import type { EventTypeConvention } from '@/lib/api/types';

type CreateEventCatalogEntry = {
    backgroundImageSrc?: string;
    startAtLabelKey: string;
    initialSessionTitleKey?: string;
};

const CREATE_EVENT_CATALOG: Partial<Record<EventTypeConvention, CreateEventCatalogEntry>> = {
    WEDDING: {
        backgroundImageSrc: '/images/banner.jpg',
        startAtLabelKey: 'fieldLabels.WEDDING.startAt',
        initialSessionTitleKey: 'initialSessions.WEDDING.title',
    },
    BAPTISM: {
        backgroundImageSrc: '/images/venue.png',
        startAtLabelKey: 'fieldLabels.BAPTISM.startAt',
        initialSessionTitleKey: 'initialSessions.BAPTISM.title',
    },
};

export function getCreateEventCatalogEntry(eventType: EventTypeConvention): CreateEventCatalogEntry | undefined {
    return CREATE_EVENT_CATALOG[eventType];
}
