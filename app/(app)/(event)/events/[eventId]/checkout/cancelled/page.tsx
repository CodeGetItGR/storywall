'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { routes } from '@/lib/routes';

export default function CheckoutCancelledPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const t = useTranslations('CheckoutCancelledPage');

    return (
        <main className="mx-auto max-w-xl px-4 py-10 text-center sm:py-16">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
                <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
                <p className="mt-3 text-sm text-ink-muted">{t('body')}</p>
                <Link className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white sm:w-auto" href={routes.post.feed(eventId)}>
                    {t('returnToEvent')}
                </Link>
            </div>
        </main>
    );
}
