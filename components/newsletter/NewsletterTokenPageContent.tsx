'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { NewsletterSubscribeForm } from '@/components/newsletter/NewsletterSubscribeForm';
import { useAppNewsletterConfig } from '@/hooks/useAppConfig';
import { type NewsletterTokenAction, useNewsletterTokenAction } from '@/hooks/useNewsletter';

// The backend answers 204 for any token, so "done" is the only outcome a
// valid-looking link can have; "error" is reserved for transport failures.
export function NewsletterTokenPageContent({ action }: { action: NewsletterTokenAction }) {
    const t = useTranslations('NewsletterPage');
    const { errorMessage, state } = useNewsletterTokenAction(action);
    const config = useAppNewsletterConfig();
    const isPending = state === 'pending';
    const isDone = state === 'done';
    const showResubscribe = action === 'unsubscribe' && isDone && config;

    const title = isPending
        ? t(`${action}.pendingTitle`)
        : isDone
          ? t(`${action}.doneTitle`)
          : state === 'missing-token'
            ? t('missingTitle')
            : t('errorTitle');
    const description = isPending
        ? t('pendingDescription')
        : isDone
          ? action === 'unsubscribe'
              ? t('unsubscribe.doneDescription')
              : null
          : state === 'missing-token'
            ? t('missingDescription')
            : errorMessage;

    return (
        <AuthLayout>
            {/* Status */}
            <div className="flex flex-col items-center text-center">
                {isPending ? (
                    <Loader2 aria-hidden="true" className="mb-5 size-10 animate-spin text-primary" />
                ) : isDone ? (
                    <CheckCircle2 aria-hidden="true" className="mb-5 size-10 text-emerald-600" />
                ) : (
                    <XCircle aria-hidden="true" className="mb-5 size-10 text-red-500" />
                )}
                <h1 className="text-2xl font-bold text-ink">{title}</h1>
                {description && <p className="mt-2 text-sm text-ink-muted">{description}</p>}
            </div>

            {/* Resubscribe */}
            {showResubscribe && (
                <section className="mt-7 border-t border-border/70 pt-6">
                    <h2 className="mb-2 text-sm font-semibold text-ink">{t('unsubscribe.resubscribeTitle')}</h2>
                    <NewsletterSubscribeForm config={config} tone="light" />
                </section>
            )}

            {/* Next action */}
            {!isPending && (
                <Link
                    href="/"
                    className="mt-7 flex w-full items-center justify-center rounded-full bg-surface-muted py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70"
                >
                    {t('home')}
                </Link>
            )}
        </AuthLayout>
    );
}
