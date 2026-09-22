'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function EventDeletedBanner({ event }: { event: EventDetailResponseDto }) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const date = event.deletionScheduledFor ? formatDate(locale, event.deletionScheduledFor, { dateStyle: 'long' }) : null;

    return (
        <>
            {/* Deleted */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-sm font-semibold text-rose-700">{t('settings.deleted.title')}</p>
                {date && <p className="mt-1 text-xs leading-relaxed text-rose-700/80">{t('settings.deleted.body', { date })}</p>}
            </div>
        </>
    );
}
