'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { useEventBilling } from '@/hooks/useBilling';
import { routes } from '@/lib/routes';

export default function CheckoutSuccessPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const t = useTranslations('CheckoutSuccessPage');
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const billing = useEventBilling(eventId);
    const [timedOut, setTimedOut] = useState(false);
    const paid = useMemo(() => billing.data?.orders.some((order) => (!orderId || order.id === orderId) && order.status === 'PAID'), [billing.data, orderId]);
    useEffect(() => {
        const timer = window.setTimeout(() => setTimedOut(true), 30000);
        return () => window.clearTimeout(timer);
    }, []);

    return (
        <main className="mx-auto max-w-xl px-4 py-10 text-center sm:py-16">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark">{t('eyebrow')}</p>
                <h1 className="mt-2 text-2xl font-bold text-ink">{paid ? t('paidTitle') : t('processingTitle')}</h1>
                <p className="mt-3 text-sm text-ink-muted">
                    {paid ? t('paidBody') : timedOut ? t('timedOutBody') : t('processingBody')}
                </p>
                {orderId && <p className="mt-3 text-xs text-ink-faint">{t('orderId', { orderId })}</p>}
                <Link className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white sm:w-auto" href={routes.post.feed(eventId)}>
                    {t('backToEvent')}
                </Link>
            </div>
        </main>
    );
}
