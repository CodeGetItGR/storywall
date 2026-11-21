'use client';

import { useAnnouncementComposerTrigger } from '@/hooks/useAnnouncementComposerTrigger';

// Mounted once in the event layout: ?compose=announcement links and the feed's
// Announcement links open the composer in Announcement mode. Renders nothing.
export function AnnouncementComposerTrigger() {
    useAnnouncementComposerTrigger();
    return null;
}
