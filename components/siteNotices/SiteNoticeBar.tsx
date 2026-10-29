'use client';

import { SiteNoticeBanner } from '@/components/siteNotices/SiteNoticeBanner';
import { useSiteNoticeBar } from '@/hooks/useSiteNoticeBar';
import type { SiteNoticeViewArea } from '@/lib/siteNotices';

// The notice bar for a given area; renders nothing when no notice applies.
export function SiteNoticeBar({ area, initialDismissed }: { area: SiteNoticeViewArea | null; initialDismissed: string }) {
    const view = useSiteNoticeBar(area, initialDismissed);
    if (!view) return null;
    return <SiteNoticeBanner tone={view.tone} message={view.message} link={view.link} onDismiss={view.onDismiss} />;
}
