import { RsvpSubmitFormContent } from '@/components/rsvp/RsvpSubmitFormContent';
import { RsvpSubmittedContent } from '@/components/rsvp/RsvpSubmittedContent';
import type { useRsvpSubmitPageData } from '@/hooks/useRsvpSubmitPageData';

export type RsvpSubmitPageData = ReturnType<typeof useRsvpSubmitPageData>;

export function RsvpSubmitPageContent({ data }: { data: RsvpSubmitPageData }) {
    if (data.submitted) {
        return <RsvpSubmittedContent data={data} />;
    }

    return <RsvpSubmitFormContent data={data} />;
}
