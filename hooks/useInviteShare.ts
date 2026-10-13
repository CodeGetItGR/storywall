'use client';

import { useCopyText } from '@/hooks/useCopyText';
import { useNativeShare } from '@/hooks/useNativeShare';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import { useShareLink } from '@/hooks/useShareLink';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { findAutoInviteQrLink } from '@/lib/qrLinks';
import { useActiveEvent, useIsHost, useRouteEventId } from '@/providers/EventProvider';

// Shares the event's general invite link from the host's own device: the share
// sheet where the browser has one, otherwise the link is copied.
export function useInviteShare() {
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const routeEventId = useRouteEventId();
    const isLive = Boolean(activeEvent) && activeEvent?.status !== 'DRAFT' && !isEventDeleted(activeEvent) && !activeEvent?.suspended;
    // Only on event routes: id-less pages like /home must not fire event-scoped requests.
    const eventId = isHost && isLive && routeEventId === activeEvent?.id ? routeEventId : null;
    const { data: qrLinks } = useEventQrLinks(eventId);
    const inviteLink = eventId ? findAutoInviteQrLink(qrLinks ?? []) : null;
    const shareLink = useShareLink(inviteLink?.publicUrl ?? '');
    const { canShare, share: nativeShare } = useNativeShare(shareLink, activeEvent?.title);
    const { copied, copy } = useCopyText(shareLink);

    return {
        available: Boolean(inviteLink),
        copied,
        share: canShare ? nativeShare : copy,
    };
}
