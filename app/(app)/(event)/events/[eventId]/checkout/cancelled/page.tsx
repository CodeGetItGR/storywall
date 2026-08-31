'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { clearPendingCheckout } from '@/lib/billing';
import { routes } from '@/lib/routes';

export default function CheckoutCancelledPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const router = useRouter();

    useEffect(() => {
        clearPendingCheckout(eventId);
        router.replace(routes.events.checkoutReview(eventId, 'activation', null, true));
    }, [eventId, router]);

    return null;
}
