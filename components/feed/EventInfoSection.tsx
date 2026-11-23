'use client';

import { useTranslations } from 'next-intl';

import { AddToCalendarSheet } from '@/components/feed/AddToCalendarSheet';
import { EventInfo } from '@/components/feed/EventInfo';
import { useAddToCalendar } from '@/hooks/useAddToCalendar';
import type { EventDetailResponseDto } from '@/lib/api/types';

// What the row reads: the public page (KAN-246) has these too.
export type EventInfoEvent = Pick<EventDetailResponseDto, 'id' | 'title' | 'schedule' | 'location' | 'sessions'>;

type EventInfoSectionProps = {
    event: EventInfoEvent;
    // The main session's place page for a member; null for a signed-out visitor, who can't open it.
    placeHref: string | null;
    className?: string;
};

// The date + place row under the pill in Social Feed mode, and under the cover for a signed-out visitor (KAN-246).
// Tapping the date opens Add to calendar while the event has something to add.
export function EventInfoSection({ event, placeHref, className = 'w-full px-4' }: EventInfoSectionProps) {
    const t = useTranslations('FeedPage');
    const calendar = useAddToCalendar(event.id, event);

    return (
        <>
            {/* Date and place */}
            <EventInfo
                date={event.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0}
                place={event.location.name ?? event.location.address ?? ''}
                className={className}
                onDateClick={calendar.available ? calendar.openSheet : undefined}
                dateLabel={t('addToCalendar')}
                placeHref={placeHref}
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
