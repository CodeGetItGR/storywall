'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCancelEventDeletion } from '@/hooks/useEventDeletion';
import { formatDate } from '@/lib/datetime';

export function EventPendingDeletionBanner({ eventId, deletionScheduledFor }: { eventId: string; deletionScheduledFor: string }) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const cancelDeletion = useCancelEventDeletion(eventId);
    const date = formatDate(locale, deletionScheduledFor, { dateStyle: 'long' });

    function handleUndo() {
        cancelDeletion.mutate();
    }

    return (
        <>
            {/* Pending deletion */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center">
                <p className="text-sm font-semibold text-rose-700">{t('settings.pendingDeletion.title')}</p>
                <p className="mt-1 text-xs leading-relaxed text-rose-700/80">{t('settings.pendingDeletion.body', { date })}</p>
                <button
                    type="button"
                    onClick={handleUndo}
                    disabled={cancelDeletion.isPending}
                    className="mt-4 inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {cancelDeletion.isPending ? t('settings.pendingDeletion.undoing') : t('settings.pendingDeletion.undo')}
                </button>
                {cancelDeletion.error && (
                    <p role="alert" className="mt-2 text-xs text-rose-700">
                        {toErrorMessage(cancelDeletion.error)}
                    </p>
                )}
            </div>
        </>
    );
}
