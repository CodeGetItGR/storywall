'use client';

import { useTranslations } from 'next-intl';

import { AddToCalendarSheet } from '@/components/feed/AddToCalendarSheet';
import { EventInfo } from '@/components/feed/EventInfo';
import { useAddToCalendar } from '@/hooks/useAddToCalendar';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

export function EventInfoSection({ event }: { event: EventDetailResponseDto }) {
    const t = useTranslations('FeedPage');
    const calendar = useAddToCalendar(event.id, event);
    // Same target as the banner's main session button, so only when that button shows.
    const hasMainSession = (event.sessions ?? []).some((session) => session.isMain);

    return (
        <>
            {/* Event details */}
            <EventInfo
                date={event.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0}
                place={event.location.name ?? event.location.address ?? ''}
                className="w-full px-4"
                onDateClick={calendar.available ? calendar.openSheet : undefined}
                dateLabel={t('addToCalendar')}
                placeHref={hasMainSession ? routes.events.location(event.id, 'main') : null}
            />
            {/* Add to calendar */}
            {calendar.available && (
                <AddToCalendarSheet
                    open={calendar.open}
                    onClose={calendar.closeSheet}
                    entries={calendar.entries}
                    selectedIndex={calendar.selectedIndex}
                    onSelectEntry={calendar.selectEntry}
                    links={calendar.links}
                />
            )}
        </>
    );
}
