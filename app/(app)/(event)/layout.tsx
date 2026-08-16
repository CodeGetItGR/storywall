'use client';

import { type ReactNode } from 'react';

import { DraftEventRouteGuard } from '@/components/event/DraftEventRouteGuard';
import { EventLifecycleBanner } from '@/components/event/EventLifecycleBanner';

export default function EventLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <EventLifecycleBanner />
            <DraftEventRouteGuard>
                <div className="lg:max-w-none">{children}</div>
            </DraftEventRouteGuard>
        </div>
    );
}
