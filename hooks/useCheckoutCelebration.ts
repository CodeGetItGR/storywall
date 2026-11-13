'use client';

import { useEffect } from 'react';

import { useCelebrationCard } from '@/hooks/useCelebrationCard';
import type { OrderSummaryDto } from '@/lib/api/types';
import { fireCelebrationConfetti } from '@/lib/celebrationConfetti';
import { showsCheckoutCelebration } from '@/lib/checkoutCelebration';
import { routes } from '@/lib/routes';
import { useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

export function useCheckoutCelebration(eventId: string, paidOrder: OrderSummaryDto | null) {
    const show = showsCheckoutCelebration(useCreateWizardEnabled(), paidOrder);
    const card = useCelebrationCard(show ? eventId : null);

    // Once, when the screen appears. Nothing fires with reduced motion.
    useEffect(() => (show ? fireCelebrationConfetti() : undefined), [show]);

    return { show, card, feedHref: routes.events.feed(eventId), inviteHref: routes.events.invitationsQr(eventId) };
}
