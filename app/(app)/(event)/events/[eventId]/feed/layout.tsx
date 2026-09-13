'use client';

import { type ReactNode } from 'react';

import { RightContextPanel } from '@/components/layout';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

export default function FeedLayout({ children }: { children: ReactNode }) {
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();

    const showRightPanel = !isLoading && Boolean(activeEvent) && isHost;

    // RightContextPanel is `sticky`, not `fixed`: it lives in this flex row so
    // it stays pinned to the viewport as the feed scrolls without needing to
    // escape any transformed ancestor (the page shell always carries a
    // transform for the account-panel swipe, which would otherwise turn a
    // `fixed` child into one positioned relative to that ancestor).
    return (
        <div className="flex">
            <div className="min-w-0 flex-1">{children}</div>
            {showRightPanel && <RightContextPanel />}
        </div>
    );
}
