'use client';

import { usePathname } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { siteNoticeAreaFor,type SiteNoticeViewArea } from '@/lib/siteNotices';
import { useEventContextLoading, useIsHost, useRouteEventId } from '@/providers/EventProvider';

export function useSiteNoticeArea(): SiteNoticeViewArea | null {
    const pathname = usePathname();
    const { user, isBootstrapping } = useAuth();
    const routeEventId = useRouteEventId();
    const isHost = useIsHost();
    const isEventLoading = useEventContextLoading();
    return siteNoticeAreaFor({ pathname, isSignedIn: Boolean(user), isAuthLoading: isBootstrapping, routeEventId, isHost, isEventLoading });
}
