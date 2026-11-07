'use client';

import { type ReactNode } from 'react';

import { RightContextPanel } from '@/components/layout/RightContextPanel';
import { useLiteHomePanel } from '@/hooks/useLiteHomePanel';

// The gallery and wishbook pages, with the host tools panel beside them when the page is a lite event's home.
// RightContextPanel is sticky, as in the feed layout, so it stays pinned while the page scrolls.
export function LiteHomeLayout({ children }: { children: ReactNode }) {
    const showsPanel = useLiteHomePanel();

    return (
        <div className="flex">
            {/* Page */}
            <div className="min-w-0 flex-1">{children}</div>
            {/* Right panel */}
            {showsPanel && <RightContextPanel liteHome />}
        </div>
    );
}
