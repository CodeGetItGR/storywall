'use client';

import { RsvpSubmitPageContent } from '@/components/rsvp/RsvpSubmitPageContent';
import { useRsvpSubmitPageData } from '@/hooks/useRsvpSubmitPageData';

export default function RsvpSubmitBoundary() {
    const data = useRsvpSubmitPageData();

    return <RsvpSubmitPageContent data={data} />;
}
