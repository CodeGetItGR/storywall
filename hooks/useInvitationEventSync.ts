'use client';

import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';

import { useEvent } from '@/hooks/useEvent';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import { useThemeSampleSections } from '@/hooks/useThemeSampleSections';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { eventImageUrls, invitationEventDataFromDetail } from '@/lib/invitation/eventData';
import type { InvitationEventData } from '@/lib/invitation/eventLinks';
import { syncWithEvent } from '@/lib/invitation/eventLinks';
import { invitationLanguage } from '@/lib/invitation/labels';
import type { MediaResolver } from '@/lib/invitation/render';
import { findAutoInviteQrLink } from '@/lib/qrLinks';

// The open draft following its event (KAN-84): the event's detail and guest link, the linked sections kept up to date
// outside the undo history, and the event's photo URLs on top of the draft's own. Nothing for a draft on no event.
export function useInvitationEventSync(store: InvitationEditorStore, eventId: string | null, media: MediaResolver, themeSlug: string | null) {
    const { data: detail } = useEvent(eventId);
    const { data: qrLinks } = useEventQrLinks(eventId);
    const theme = useThemeSampleSections(eventId ? themeSlug : null);
    const samples = theme?.sections ?? null;
    // The reply-by line is written in the invitation's language: a language switch writes it again.
    const language = useStore(store, (state) => invitationLanguage(state.document));
    const joinUrl = qrLinks ? (findAutoInviteQrLink(qrLinks)?.publicUrl ?? null) : null;

    const event = useMemo<InvitationEventData | null>(
        () => (detail ? invitationEventDataFromDetail(detail, joinUrl) : null),
        [detail, joinUrl],
    );

    useEffect(() => {
        if (event) store.getState().sync(syncWithEvent(event, samples));
    }, [store, event, samples, language]);

    const imageUrls = useMemo(() => eventImageUrls(detail), [detail]);
    // A sample photo put back when the event's cover goes may be one the draft never had: the theme's URL draws it.
    const themeUrls = theme?.imageUrls;
    const withEventImages = useMemo<MediaResolver>(
        () => (mediaId) => media(mediaId) ?? imageUrls[mediaId] ?? themeUrls?.[mediaId],
        [media, imageUrls, themeUrls],
    );

    return { event, samples, media: withEventImages, joinUrl: event?.joinUrl ?? undefined };
}
