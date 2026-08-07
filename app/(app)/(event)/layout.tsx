'use client';

import { type ReactNode } from 'react';

import { EventLifecycleBanner } from '@/components/event/EventLifecycleBanner';
import { RightContextPanel } from '@/components/layout';
import { cn } from '@/lib/utils';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

export default function EventLayout({ children }: { children: ReactNode }) {
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();

    const showRightPanel = !isLoading && Boolean(activeEvent) && isHost;

    return (
        <div className={cn('min-h-screen bg-background', showRightPanel && 'xl:pr-75')}>
            <EventLifecycleBanner />
            <div className="lg:max-w-none">{children}</div>
            {showRightPanel && <RightContextPanel />}
        </div>
    );
}
