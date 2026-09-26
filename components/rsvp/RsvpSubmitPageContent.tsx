import { RsvpSubmitFormContent } from '@/components/rsvp/RsvpSubmitFormContent';
import { RsvpSubmittedContent } from '@/components/rsvp/RsvpSubmittedContent';
import { RsvpUnavailableState } from '@/components/rsvp/RsvpUnavailableState';
import { computeShowConfirmation, type useRsvpSubmitPageData } from '@/hooks/useRsvpSubmitPageData';

export type RsvpSubmitPageData = ReturnType<typeof useRsvpSubmitPageData>;

export function RsvpSubmitPageContent({ data }: { data: RsvpSubmitPageData }) {
    if (data.rsvpAvailability.isUnavailable && data.eventId) {
        return (
            <RsvpUnavailableState
                eventId={data.eventId}
                title={data.rsvpAvailability.unavailableTitle}
                body={data.rsvpAvailability.unavailableBody}
            />
        );
    }

    // A first-time RSVP whose session answers failed to save already has an
    // id (hasExistingRsvp flips true on create), but the guest still needs
    // the form — and its error — to retry. See sessionsSubmitError.
    if (computeShowConfirmation(data.submitted, data.hasExistingRsvp, Boolean(data.sessionAnswersError))) {
        return <RsvpSubmittedContent data={data} />;
    }

    return <RsvpSubmitFormContent data={data} />;
}
