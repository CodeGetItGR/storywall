'use client';

import { use } from 'react';

import { SessionLocationBoundary } from './SessionLocationBoundary';

export default function SessionLocationPage({ params }: { params: Promise<{ eventId: string; role?: string[] }> }) {
    const { eventId, role } = use(params);

    return <SessionLocationBoundary eventId={eventId} role={role?.[0]} />;
}
