'use client';

import { use } from 'react';

import { SessionLocationBoundary } from '@/app/(main)/(app)/(event)/events/[eventId]/location/[[...role]]/SessionLocationBoundary';
import { useRouteEventId } from '@/providers/EventProvider';

export default function DemoLocationPage({ params }: { params: Promise<{ eventType: string; role?: string[] }> }) {
    const { role } = use(params);
    const eventId = useRouteEventId() ?? '';

    return <SessionLocationBoundary eventId={eventId} role={role?.[0]} />;
}
