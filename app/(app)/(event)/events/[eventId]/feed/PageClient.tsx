'use client';

import { use } from 'react';

import { FeedPageBoundary } from './FeedPageBoundary';

export default function FeedPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);

    return <FeedPageBoundary eventId={eventId} />;
}
