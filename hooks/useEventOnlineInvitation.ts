'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useInvitationDrafts } from '@/hooks/useInvitationDrafts';
import type { Locale } from '@/i18n/config';
import { getInvitationCataloguePath } from '@/i18n/publicLocale';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { fetchPublication, invitationPublicationKeys, invitationPublicUrl } from '@/lib/invitation/publication';
import { rememberStartIntent } from '@/lib/invitation/startIntent';
import { catalogueHref, DEFAULT_CATALOGUE_FILTERS, isCatalogueEventType } from '@/lib/invitation/themeCatalogue';
import { routes } from '@/lib/routes';
import { SAVE_MY_DATE_MODULE_KEY } from '@/lib/saveMyDateRelease';
import { SITE_URL } from '@/lib/seo';

// Where the invitation stands: no draft on the event yet, a draft never published, or published.
export type OnlineInvitationStatus = 'none' | 'draft' | 'live' | 'offline';

// The event's online invitation in Manage: its draft and published copy, the link guests open, and
// where to edit it, extend it or start one from a theme.
export function useEventOnlineInvitation(event: EventDetailResponseDto, { enabled }: { enabled: boolean }) {
    const locale = useLocale() as Locale;
    const drafts = useInvitationDrafts({ enabled });
    const draft = useMemo(() => drafts.data?.find((item) => item.eventId === event.id) ?? null, [drafts.data, event.id]);
    const publication = useQuery({
        queryKey: invitationPublicationKeys.detail(draft?.id ?? ''),
        queryFn: () => fetchPublication(draft!.id),
        enabled: enabled && draft !== null,
    });

    const published = publication.data ?? null;
    const status: OnlineInvitationStatus = !draft ? 'none' : !published ? 'draft' : published.online ? 'live' : 'offline';
    const liveUntil = published?.online && published.onlineUntil ? formatDate(locale, published.onlineUntil, { dateStyle: 'medium' }) : null;
    const planMissing = !isModuleAvailable(event.modules, SAVE_MY_DATE_MODULE_KEY);

    // A theme picked from the catalogue starts a draft that goes straight on this event.
    const chooseTheme = useCallback(() => rememberStartIntent({ eventId: event.id, eventType: event.eventType }), [event.eventType, event.id]);

    return {
        isLoading: enabled && (drafts.isLoading || (draft !== null && publication.isLoading)),
        isError: drafts.isError || publication.isError,
        status,
        liveUntil,
        publicUrl: published ? invitationPublicUrl(SITE_URL, published.slug) : null,
        planMissing,
        // Renewing goes through the event's plan, while the time online runs out or after it ran out.
        canExtend: !planMissing && (status === 'offline' || liveUntil !== null),
        editHref: draft ? routes.saveMyDateEditor(draft.id) : null,
        planHref: routes.events.manage(event.id, { tab: 'plan' }),
        catalogueHref: catalogueHref(getInvitationCataloguePath(locale), {
            ...DEFAULT_CATALOGUE_FILTERS,
            eventType: isCatalogueEventType(event.eventType) ? event.eventType : null,
        }),
        chooseTheme,
    };
}

export type EventOnlineInvitation = ReturnType<typeof useEventOnlineInvitation>;
