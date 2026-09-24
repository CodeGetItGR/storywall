import { RsvpSubmitFormContent } from '@/components/rsvp/RsvpSubmitFormContent';
import { RsvpSubmittedContent } from '@/components/rsvp/RsvpSubmittedContent';
import { RsvpUnavailableState } from '@/components/rsvp/RsvpUnavailableState';
import type { useRsvpSubmitPageData } from '@/hooks/useRsvpSubmitPageData';

export type RsvpSubmitPageData = ReturnType<typeof useRsvpSubmitPageData>;

export function RsvpSubmitPageContent({ data }: { data: RsvpSubmitPageData }) {
    if (data.rsvpAvailability.isUnavailable && data.eventId) {
        return <RsvpUnavailableState eventId={data.eventId} title={data.rsvpAvailability.unavailableTitle} body={data.rsvpAvailability.unavailableBody} />;
    }

    if (data.submitted || data.hasExistingRsvp) {
        return <RsvpSubmittedContent data={data} />;
    }

    return <RsvpSubmitFormContent data={data} />;
}
