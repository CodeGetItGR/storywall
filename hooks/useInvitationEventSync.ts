'use client';

import { useEffect, useMemo } from 'react';

import { useEvent } from '@/hooks/useEvent';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { eventImageUrls, invitationEventDataFromDetail } from '@/lib/invitation/eventData';
import type { InvitationEventData } from '@/lib/invitation/eventLinks';
import { syncWithEvent } from '@/lib/invitation/eventLinks';
import type { MediaResolver } from '@/lib/invitation/render';
import { findAutoInviteQrLink } from '@/lib/qrLinks';

// The open draft following its event (KAN-84): the event's detail and guest link, the linked sections kept up to date
// outside the undo history, and the event's photo URLs on top of the draft's own. Nothing for a draft on no event.
export function useInvitationEventSync(store: InvitationEditorStore, eventId: string | null, media: MediaResolver) {
    const { data: detail } = useEvent(eventId);
    const { data: qrLinks } = useEventQrLinks(eventId);
    const joinUrl = qrLinks ? (findAutoInviteQrLink(qrLinks)?.publicUrl ?? null) : null;

    const event = useMemo<InvitationEventData | null>(
        () => (detail ? invitationEventDataFromDetail(detail, joinUrl) : null),
        [detail, joinUrl],
    );

    useEffect(() => {
        if (event) store.getState().sync(syncWithEvent(event));
    }, [store, event]);

    const imageUrls = useMemo(() => eventImageUrls(detail), [detail]);
    const withEventImages = useMemo<MediaResolver>(() => (mediaId) => media(mediaId) ?? imageUrls[mediaId], [media, imageUrls]);

    return { event, media: withEventImages, joinUrl: event?.joinUrl ?? undefined };
}
