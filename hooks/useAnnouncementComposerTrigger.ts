'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useMyVendorRole } from '@/hooks/useVendors';
import { isAnnouncementComposeRequest, subscribeAnnouncementComposerRequests, withoutComposeParam } from '@/lib/announcementComposer';
import { replacePageUrl } from '@/lib/overlayHistory';
import { useComposer } from '@/providers/composer/ComposerContext';
import { useEventContextLoading, useIsHost, useRouteEventId } from '@/providers/EventProvider';

// Opens the composer in Announcement mode for ?compose=announcement and for
// in-place requests (an Announcement link tapped on the feed itself). The
// param is replaced away first and the composer opens only once it's gone, so
// Back never lands on a URL that reopens it, and no server render happens.
// The trigger waits for the role checks, so a guest's link is just dropped.
export function useAnnouncementComposerTrigger() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { canAnnounce, openAnnouncementComposer } = useComposer();
    const isLoading = useEventContextLoading();
    const isHost = useIsHost();
    const routeEventId = useRouteEventId();
    const vendorRole = useMyVendorRole(isHost ? null : routeEventId);
    const requested = isAnnouncementComposeRequest(searchParams);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!requested || isLoading || vendorRole.isLoading) return;
        replacePageUrl(withoutComposeParam(pathname, searchParams.toString()));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- The trigger param is consumed once; open after it leaves the URL.
        if (canAnnounce) setPending(true);
    }, [canAnnounce, isLoading, pathname, requested, searchParams, vendorRole.isLoading]);

    useEffect(() => {
        if (!pending || requested) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Opens only once the trigger param is gone.
        setPending(false);
        openAnnouncementComposer();
    }, [openAnnouncementComposer, pending, requested]);

    useEffect(() => subscribeAnnouncementComposerRequests(openAnnouncementComposer), [openAnnouncementComposer]);
}
