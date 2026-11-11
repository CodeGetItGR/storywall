'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

import type { CelebrationCard } from '@/components/checkout/CheckoutCelebration';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEvent } from '@/hooks/useEvent';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { OrderSummaryDto } from '@/lib/api/types';
import { fireCelebrationConfetti } from '@/lib/celebrationConfetti';
import { showsCheckoutCelebration } from '@/lib/checkoutCelebration';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { formatEventDateParts } from '@/lib/datetime';
import { routes } from '@/lib/routes';
import { useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

export function useCheckoutCelebration(eventId: string, paidOrder: OrderSummaryDto | null) {
    const locale = useLocale();
    const show = showsCheckoutCelebration(useCreateWizardEnabled(), paidOrder);
    const { data: event } = useEvent(show ? eventId : null);
    const { data: appConfig } = useAppConfig();
    const typeCopy = useLocalizedAppEventTypeCopy();

    // Once, when the screen appears. Nothing fires with reduced motion.
    useEffect(() => (show ? fireCelebrationConfetti() : undefined), [show]);

    const imageUrl = event ? (appConfig?.eventTypes.find((type) => type.eventTypeKey === event.eventType)?.imageUrl ?? null) : null;
    const card: CelebrationCard | null = event
        ? {
              photoSrc: createEventTypePhoto(event.eventType, imageUrl),
              alt: typeCopy(event.eventType).name,
              title: event.title,
              date: formatEventDateParts(locale, event.schedule.startAt, null, event.schedule.timezone)?.date ?? '',
          }
        : null;

    return { show, card, feedHref: routes.events.feed(eventId), inviteHref: routes.events.invitationsQr(eventId) };
}
