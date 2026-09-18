'use client';

import { useMemo } from 'react';

import { useGiftAccount } from '@/hooks/useGiftAccount';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import type { EventLocationDto, EventScheduleDto, EventSessionResponseDto } from '@/lib/api/types';

export interface HelpProgress {
    details: boolean;
    rsvp: boolean;
    giftAccount: boolean;
    schedule: boolean;
    invitations: boolean;
}

export function useHelpProgress({
    eventId,
    title,
    schedule,
    location,
    sessions,
}: {
    eventId: string;
    title: string;
    schedule: EventScheduleDto;
    location: EventLocationDto;
    sessions: EventSessionResponseDto[];
}): HelpProgress {
    const giftAccount = useGiftAccount(eventId);
    const qrLinks = useEventQrLinks(eventId);

    return useMemo(
        () => ({
            details: Boolean(title && schedule.startAt && schedule.endAt && location.name && location.address),
            rsvp: Boolean(schedule.rsvpDeadline),
            giftAccount: Boolean(giftAccount.data),
            schedule: sessions.some((session) => !session.deletedAt),
            invitations: (qrLinks.data ?? []).some((link) => link.status !== 'REVOKED'),
        }),
        [title, schedule, location, sessions, giftAccount.data, qrLinks.data]
    );
}
