'use client';

import { type ReactNode, useRef } from 'react';

import { SiteNoticeBar } from '@/components/siteNotices/SiteNoticeBar';
import { useSiteNoticeArea } from '@/hooks/useSiteNoticeArea';
import { useSiteNoticeHeightVar } from '@/hooks/useSiteNoticeHeightVar';

// The app's root frame: the notice bar on top, the page below it. The (main) body is locked to the
// viewport height and pages scroll inside their own containers, so the page sits in a flex-1 slot
// instead of the body's full height. No z-index: story and slideshow overlays must cover the bar.
export function SiteNoticeFrame({ children, initialDismissed }: { children: ReactNode; initialDismissed: string }) {
    const area = useSiteNoticeArea();
    const barRef = useRef<HTMLDivElement>(null);
    useSiteNoticeHeightVar(barRef);

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Notice */}
            <div ref={barRef} className="shrink-0">
                <SiteNoticeBar area={area} initialDismissed={initialDismissed} />
            </div>
            {/* Page */}
            <div className="min-h-0 flex-1">{children}</div>
        </div>
    );
}
