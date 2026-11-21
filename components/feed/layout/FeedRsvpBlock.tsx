import { RsvpPrompt } from '@/components/feed/RsvpPrompt';

// The feed's RSVP block (feedRsvp) for a member who hasn't replied.
export function FeedRsvpBlock({ eventId, deadline }: { eventId: string; deadline: string | null }) {
    return (
        <section className={'mt-5 px-4 pb-5'}>
            <RsvpPrompt eventId={eventId} deadline={deadline} />
        </section>
    );
}
