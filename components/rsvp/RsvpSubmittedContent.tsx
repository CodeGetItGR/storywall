import { RsvpHeader } from '@/components/rsvp/RsvpHeader';
import type { RsvpSubmitPageData } from '@/components/rsvp/RsvpSubmitPageContent';
import { RsvpSubmittedView } from '@/components/rsvp/RsvpSubmittedView';

export function RsvpSubmittedContent({ data }: { data: RsvpSubmitPageData }) {
    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <RsvpHeader backHref={data.backHref} />
            <RsvpSubmittedView eventType={data.eventType} attending={data.attending} onBackToWallAction={data.onBackToWall} />
        </div>
    );
}
