'use client';

import { EventListItem } from '@/components/events/EventListItem';
import type { EventGridItem } from '@/hooks/useEventGridItems';

export function EventsGrid({ items }: { items: EventGridItem[] }) {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map(({ member, event, isLoading }) => (
                <EventListItem key={member.eventId} eventId={member.eventId} member={member} event={event} isLoading={isLoading} />
            ))}
        </div>
    );
}
