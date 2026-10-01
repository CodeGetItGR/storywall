'use client';

import { FeedPageBoundary } from '@/app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageBoundary';
import { useRouteEventId } from '@/providers/EventProvider';

export default function DemoFeedPage() {
    return <FeedPageBoundary eventId={useRouteEventId() ?? ''} />;
}
