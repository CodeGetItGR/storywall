'use client';

import { RotateCcw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatDate } from '@/lib/datetime';

export function EventPendingDeletionBanner({
    deletionScheduledFor,
    onUndoAction,
    isUndoing,
}: {
    deletionScheduledFor: string;
    onUndoAction: () => void;
    isUndoing: boolean;
}) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const date = formatDate(locale, deletionScheduledFor, { dateStyle: 'long' });

    return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center">
            <p className="text-sm font-semibold text-rose-700">{t('settings.pendingDeletion.title')}</p>
            <p className="mt-1 text-xs leading-relaxed text-rose-700/80">{t('settings.pendingDeletion.body', { date })}</p>
            <button
                type="button"
                onClick={onUndoAction}
                disabled={isUndoing}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {isUndoing ? t('settings.pendingDeletion.undoing') : t('settings.pendingDeletion.undo')}
            </button>
        </div>
    );
}
