'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import type { EventGridItem } from '@/hooks/useEventGridItems';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { useMemberRoleLabel } from '@/hooks/useMemberRoleLabel';
import { formatDate, formatEventListDate } from '@/lib/datetime';
import { eventCardStatus, isEventDeleted } from '@/lib/eventLifecycle';
import { eventHomeHref } from '@/lib/liteEvents';
import { routes } from '@/lib/routes';

// Display values for one card in the home events rail.
export function useEventQuickCard({ member, event }: EventGridItem) {
    const tEvents = useTranslations('EventsPage');
    const locale = useLocale();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const [now] = useState(() => Date.now());

    const isHost = member.role === 'HOST';
    const memberRole = useMemberRoleLabel(member, event?.eventType);
    const roleLabel = memberRole ?? (isHost ? tEvents('roleFallback.host') : null);
    const typeLabel = event ? eventTypeCopy(event.eventType).name : null;
    // A deleted event shows its purge date instead of the event date; the status says why.
    const isDeleted = isEventDeleted(event);
    const dateLabel =
        isDeleted && event?.deletionScheduledFor
            ? formatDate(locale, event.deletionScheduledFor, { dateStyle: 'medium' })
            : formatEventListDate(event?.schedule.startAt, locale, tEvents('dateAt'));

    const status = event ? eventCardStatus(event, now) : null;

    return {
        // Until the detail loads, the feed link stands in; the route guards forward from there.
        href: event ? eventHomeHref(event) : routes.events.feed(member.eventId),
        coverUrl: event?.coverMedia?.mediaUrl ?? null,
        title: event?.title ?? tEvents('eventUnavailable'),
        detailLabel: [typeLabel, roleLabel].filter(Boolean).join(' · '),
        status,
        statusLabel: status ? tEvents(`status.${status}`) : null,
        dateLabel,
    };
}
