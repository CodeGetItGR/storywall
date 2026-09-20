'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatDate } from '@/lib/datetime';

export function EventPendingDeletionBanner({ deletionScheduledFor }: { deletionScheduledFor: string }) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const date = formatDate(locale, deletionScheduledFor, { dateStyle: 'long' });

    return (
        <>
            {/* Pending deletion */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center">
                <p className="text-sm font-semibold text-rose-700">{t('settings.pendingDeletion.title')}</p>
                <p className="mt-1 text-xs leading-relaxed text-rose-700/80">{t('settings.pendingDeletion.body', { date })}</p>
            </div>
        </>
    );
}
