'use client';

import { FeedPageBoundary } from '@/app/(app)/(event)/events/[eventId]/feed/FeedPageBoundary';
import { DEMO_EVENT_ID } from '@/lib/demo/demoConstants';

export default function DemoFeedPage() {
    return <FeedPageBoundary eventId={DEMO_EVENT_ID} />;
}
