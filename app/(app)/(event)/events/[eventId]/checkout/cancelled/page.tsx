'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCheckout } from '@/hooks/useBilling';
import { clearPendingCheckout, navigateToCheckout } from '@/lib/billing';
import { routes } from '@/lib/routes';
import { useActiveEvent } from '@/providers/EventProvider';

export default function CheckoutCancelledPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const t = useTranslations('CheckoutCancelledPage');
    const activeEvent = useActiveEvent();
    const checkout = useCheckout(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [error, setError] = useState<string | null>(null);
    const canRetryActivation = activeEvent?.id === eventId && activeEvent.status === 'DRAFT';

    useEffect(() => clearPendingCheckout(eventId), [eventId]);

    async function retryCheckout() {
        setError(null);
        try {
            const result = await checkout.mutateAsync();
            navigateToCheckout(eventId, result);
        } catch (checkoutError) {
            setError(toErrorMessage(checkoutError));
        }
    }

    return (
        <main className="mx-auto max-w-xl px-4 py-10 text-center sm:py-16">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
                <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
                <p className="mt-3 text-sm text-ink-muted">{t('body')}</p>
                {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
                {canRetryActivation ? (
                    <button
                        type="button"
                        onClick={retryCheckout}
                        disabled={checkout.isPending}
                        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto"
                    >
                        {checkout.isPending ? t('retrying') : t('retryPayment')}
                    </button>
                ) : (
                    <Link
                        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white sm:w-auto"
                        href={routes.events.settingsPlan(eventId)}
                    >
                        {t('returnToBilling')}
                    </Link>
                )}
            </div>
        </main>
    );
}
