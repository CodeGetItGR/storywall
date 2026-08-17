'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { billingKeys, useEventBilling } from '@/hooks/useBilling';
import { eventKeys } from '@/hooks/useEvent';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { clearPendingCheckout, readPendingCheckout } from '@/lib/billing';
import { routes } from '@/lib/routes';
import { useActiveEvent } from '@/providers/EventProvider';

export default function CheckoutSuccessPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const t = useTranslations('CheckoutSuccessPage');
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const activeEvent = useActiveEvent();
    const [pendingCheckout] = useState(() => readPendingCheckout(eventId));
    const orderId = searchParams.get('orderId') ?? pendingCheckout?.orderId ?? null;
    const targetPlanTierCode = searchParams.get('planTierCode') ?? pendingCheckout?.planTierCode ?? null;
    const billing = useEventBilling(eventId);
    const [timedOut, setTimedOut] = useState(false);
    const isDraftEvent = activeEvent?.id === eventId && activeEvent.status === 'DRAFT';
    const paid = useMemo(
        () =>
            Boolean(orderId) &&
            billing.data?.orders.some((order) => order.id === orderId && order.status === 'PAID') &&
            (!targetPlanTierCode || billing.data.planTierCode === targetPlanTierCode),
        [billing.data, orderId, targetPlanTierCode]
    );
    useEffect(() => {
        const timer = window.setTimeout(() => setTimedOut(true), 30000);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!paid) return;
        clearPendingCheckout(eventId);
        void queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
        void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
        void queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
    }, [eventId, paid, queryClient]);

    return (
        <main className="mx-auto max-w-xl px-4 py-10 text-center sm:py-16">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark">{t('eyebrow')}</p>
                <h1 className="mt-2 text-2xl font-bold text-ink">{paid ? t('paidTitle') : t('processingTitle')}</h1>
                <p className="mt-3 text-sm text-ink-muted">{paid ? t('paidBody') : timedOut ? t('timedOutBody') : t('processingBody')}</p>
                {orderId && <p className="mt-3 text-xs text-ink-faint">{t('orderId', { orderId })}</p>}
                <Link
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white sm:w-auto"
                    href={paid ? routes.post.feed(eventId) : routes.manage}
                >
                    {paid ? t('backToEvent') : t('backToSetup')}
                </Link>
            </div>
            {!paid && isDraftEvent && <p className="mt-5 text-sm leading-relaxed text-ink-muted">{t('draftProcessingNote')}</p>}
        </main>
    );
}
