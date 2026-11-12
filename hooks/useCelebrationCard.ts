'use client';

import { useLocale } from 'next-intl';

import type { CelebrationCard } from '@/components/celebration/EventCelebration';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEvent } from '@/hooks/useEvent';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { formatEventDateParts } from '@/lib/datetime';

// The tilted card on a celebration screen: the event type's photo, the title and the date. Null until loaded.
export function useCelebrationCard(eventId: string | null): CelebrationCard | null {
    const locale = useLocale();
    const { data: event } = useEvent(eventId);
    const { data: appConfig } = useAppConfig();
    const typeCopy = useLocalizedAppEventTypeCopy();

    if (!event) return null;
    const imageUrl = appConfig?.eventTypes.find((type) => type.eventTypeKey === event.eventType)?.imageUrl ?? null;
    return {
        photoSrc: createEventTypePhoto(event.eventType, imageUrl),
        alt: typeCopy(event.eventType).name,
        title: event.title,
        date: formatEventDateParts(locale, event.schedule.startAt, null, event.schedule.timezone)?.date ?? '',
    };
}
