import { EventInfoSection } from '@/components/feed/EventInfoSection';
import type { EventDetailResponseDto } from '@/lib/api/types';

// The feed's details + countdown block (feedDetails).
export function FeedDetailsBlock({ event }: { event: EventDetailResponseDto }) {
    return (
        <section className="mt-3">
            <EventInfoSection event={event} />
        </section>
    );
}
