'use client';

import { use } from 'react';

import { SessionLocationBoundary } from '@/app/(main)/(app)/(event)/events/[eventId]/location/[[...role]]/SessionLocationBoundary';
import { DEMO_EVENT_ID } from '@/lib/demo/demoConstants';

export default function DemoLocationPage({ params }: { params: Promise<{ role?: string[] }> }) {
    const { role } = use(params);

    return <SessionLocationBoundary eventId={DEMO_EVENT_ID} role={role?.[0]} />;
}
