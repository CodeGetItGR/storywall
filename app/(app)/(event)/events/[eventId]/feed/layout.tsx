'use client';

import { type ReactNode } from 'react';

import { RightContextPanel } from '@/components/layout';
import { cn } from '@/lib/utils';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

export default function FeedLayout({ children }: { children: ReactNode }) {
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();

    const showRightPanel = !isLoading && Boolean(activeEvent) && isHost;

    return (
        <div className={cn(showRightPanel && 'xl:pr-75')}>
            {children}
            {showRightPanel && <RightContextPanel />}
        </div>
    );
}
