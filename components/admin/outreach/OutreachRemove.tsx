'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useOutreachRemoval } from '@/hooks/useOutreachRemoval';

// The second click removes. Kept inline, as the outreach spec asks.
export function OutreachRemove({ prospectId, onRemovedAction }: { prospectId: string; onRemovedAction: () => void }) {
    const t = useTranslations('AdminPage.outreach.remove');
    const removal = useOutreachRemoval(prospectId, onRemovedAction);
    const toErrorMessage = useApiErrorMessage();

    return (
        <section className="space-y-2 border-t border-border pt-4">
            {!removal.armed && (
                <button
                    type="button"
                    onClick={removal.arm}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-sm font-semibold text-status-danger hover:underline"
                >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    {t('action')}
                </button>
            )}

            {/* Confirm */}
            {removal.armed && (
                <div className="flex flex-wrap items-center gap-2">
                    <p className="mr-auto text-sm text-ink">{t('confirmBody')}</p>
                    <button
                        type="button"
                        onClick={removal.disarm}
                        className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink"
                    >
                        {t('keep')}
                    </button>
                    <button
                        type="button"
                        onClick={removal.confirm}
                        disabled={removal.isRemoving}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-status-danger px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {removal.isRemoving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                        {t('confirm')}
                    </button>
                </div>
            )}

            {Boolean(removal.error) && (
                <p role="alert" className="text-sm text-status-danger">
                    {toErrorMessage(removal.error)}
                </p>
            )}
        </section>
    );
}
