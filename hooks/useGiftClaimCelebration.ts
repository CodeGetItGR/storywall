'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { useCelebrationCard } from '@/hooks/useCelebrationCard';
import type { GiftClaimResponseDto } from '@/lib/api/types';
import { fireCelebrationConfetti } from '@/lib/celebrationConfetti';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

/**
 * After a claim: the event is theirs now (COMPLETED), or they are a host until
 * ownership moves on a date (CLAIMED), or once a review ends (CLAIMED, no date).
 */
export function useGiftClaimCelebration(outcome: GiftClaimResponseDto) {
    const t = useTranslations('GiftMode.claim.outcome');
    const locale = useLocale();
    const card = useCelebrationCard(outcome.eventId);

    // Once, when the screen appears. Nothing fires with reduced motion.
    useEffect(() => fireCelebrationConfetti(), []);

    const line =
        outcome.status === 'COMPLETED'
            ? t('completed')
            : outcome.ownershipTransfersAt
              ? t('claimed', { date: formatDate(locale, outcome.ownershipTransfersAt, { dateStyle: 'long' }) })
              : t('claimedSoon');

    return {
        card,
        heading: t('title'),
        line,
        feedHref: routes.events.feed(outcome.eventId),
        inviteHref: routes.events.invitationsQr(outcome.eventId),
    };
}
