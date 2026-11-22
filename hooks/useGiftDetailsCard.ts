'use client';

import { useLocale } from 'next-intl';

import { useEvent } from '@/hooks/useEvent';
import { useGiftClaimUrl } from '@/hooks/useGiftClaimUrl';
import type { GiftHandoverResponseDto } from '@/lib/api/types';
import { formatEventDateParts } from '@/lib/datetime';
import { canPrintGiftCard } from '@/lib/gift';

// What the gift's card shows besides its names: the event, its date, and the live card's claim link.
export function useGiftDetailsCard(eventId: string, gift: GiftHandoverResponseDto) {
    const locale = useLocale();
    const { data: event } = useEvent(eventId);
    const claimUrl = useGiftClaimUrl(canPrintGiftCard(gift) ? gift.token : null);

    return {
        claimUrl,
        eventTitle: event?.title ?? null,
        eventDate: event ? (formatEventDateParts(locale, event.schedule.startAt, null, event.schedule.timezone)?.date ?? null) : null,
    };
}
