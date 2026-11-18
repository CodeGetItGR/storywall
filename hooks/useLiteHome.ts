'use client';

import { useMemo } from 'react';

import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import { isLiveLiteEvent, type LiteModulePage, liteModulePages } from '@/lib/eventCapabilities';
import { findGuestQrLink } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

export type LiteQuickActionKey = 'qr' | 'share' | 'download' | 'upgrade';

// Whether this gallery or wishbook page is a lite event's home, and what its header shows: the Bundle's tabs
// and the host's quick actions. onDownload is the page's own "download everything" (the gallery archive, or
// the wishbook book); leave it out while there is nothing to download.
export function useLiteHome(page: LiteModulePage, { onDownload }: { onDownload?: () => void } = {}) {
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isHome = isLiveLiteEvent(activeEvent);
    const eventId = isHome && isHost ? (activeEvent?.id ?? null) : null;
    const { data: qrLinks } = useEventQrLinks(eventId);
    const upgradeHref = usePlanUpgradeHref(activeEvent?.id ?? '');
    const guestLink = findGuestQrLink(qrLinks ?? []);

    return useMemo(() => {
        if (!isHome || !activeEvent) return { isHome: false as const };
        const tabs =
            liteModulePages(activeEvent.modules).length > 1
                ? {
                      active: page,
                      hrefs: { gallery: routes.events.tools.gallery(activeEvent.id), wishbook: routes.events.tools.wishbook(activeEvent.id) },
                  }
                : null;
        const actions: LiteQuickActionKey[] = [];
        if (isHost && guestLink?.status === 'ACTIVE') actions.push('qr', 'share');
        if (isHost && onDownload) actions.push('download');
        if (isHost && upgradeHref) actions.push('upgrade');
        return { isHome: true as const, event: activeEvent, tabs, actions, guestLink, upgradeHref, onDownload };
    }, [activeEvent, guestLink, isHome, isHost, onDownload, page, upgradeHref]);
}

export type LiteHomeState = Extract<ReturnType<typeof useLiteHome>, { isHome: true }>;
export type LiteHomeTabsState = NonNullable<LiteHomeState['tabs']>;
