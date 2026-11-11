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

// Every event type gets a main session; types without a catalog entry use initialSessions.<type>.title.
export function getInitialSessionTitleKey(eventType: EventTypeConvention): string {
    return CREATE_EVENT_CATALOG[eventType]?.initialSessionTitleKey ?? `initialSessions.${eventType}.title`;
}

export function getCreateEventCatalogEntry(eventType: EventTypeConvention): CreateEventCatalogEntry | undefined {
    return CREATE_EVENT_CATALOG[eventType];
}

// The wizard's type photos (spec 5.1), used while a type has no admin-uploaded image. The old flow keeps
// backgroundImageSrc above.
const CREATE_EVENT_TYPE_PHOTOS: Record<EventTypeConvention, string> = {
    WEDDING: '/landing/03-wedding-ceremony-santorini.webp',
    BAPTISM: '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.webp',
    SOCIAL_EVENT: '/landing/guests-mingling-with-champagne-at-an-elegant-vip-social-party.webp',
    BIRTHDAY: '/landing/woman-in-black-dress-holding-birthday-cake.webp',
    PRIVATE_PARTY: '/landing/guests-dancing-at-an-elegant-vip-social-party-at-night.webp',
    GENDER_REVEAL: '/landing/gender-reveal-box-opening-with-blue-balloons-and-confetti.webp',
    BABY_SHOWER: '/landing/pregnant-woman-and-friends-with-pink-and-blue-balloons.webp',
    REUNION: '/landing/friends-and-family-celebrating-at-sunset.webp',
};

export function createEventTypePhoto(eventType: EventTypeConvention, imageUrl: string | null): string {
    return imageUrl ?? CREATE_EVENT_TYPE_PHOTOS[eventType];
}
