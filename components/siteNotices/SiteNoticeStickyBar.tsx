'use client';

import { useRef } from 'react';

import { SiteNoticeBar } from '@/components/siteNotices/SiteNoticeBar';
import { useSiteNoticeHeightVar } from '@/hooks/useSiteNoticeHeightVar';

// The landing layout's notice bar: those pages scroll the document, so it pins itself to the top of
// the screen. Above the page's header (z-30), below the cookie banner (z-40) and sheets.
export function SiteNoticeStickyBar({ initialDismissed }: { initialDismissed: string }) {
    const barRef = useRef<HTMLDivElement>(null);
    useSiteNoticeHeightVar(barRef);

    return (
        <div ref={barRef} className="sticky top-0 z-35">
            <SiteNoticeBar area="PUBLIC" initialDismissed={initialDismissed} />
        </div>
    );
}
