'use client';

import { useTranslations } from 'next-intl';
import type { Ref } from 'react';

type FeedEditPillsProps = { saving: boolean; failed: boolean; onCancel: () => void; onSave: () => void; cancelRef?: Ref<HTMLButtonElement> };

// Cancel and Save on the cover while editing, with the save error under them.
export function FeedEditPills({ saving, failed, onCancel, onSave, cancelRef }: FeedEditPillsProps) {
    const t = useTranslations('InvitationEditor');
    const tFeed = useTranslations('FeedEditor');

    return (
        <div className="flex flex-col items-end gap-2">
            {/* Actions */}
            <div className="flex gap-2">
                <button
                    ref={cancelRef}
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="h-9 rounded-full bg-background/92 px-3.5 text-sm font-semibold text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] disabled:opacity-60"
                >
                    {t('cancel')}
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    aria-busy={saving}
                    className="h-9 rounded-full px-3.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(36,31,26,0.18)] transition-opacity bg-gradient-brand hover:opacity-90 disabled:opacity-80"
                >
                    {saving ? t('saving') : t('save')}
                </button>
            </div>

            {/* Save error */}
            {failed && (
                <div
                    role="alert"
                    className="max-w-64 rounded-xl bg-background/95 px-3 py-2 text-right text-sm text-destructive shadow-[0_8px_22px_rgba(36,31,26,0.18)]"
                >
                    {tFeed('saveFailed')}
                </div>
            )}
        </div>
    );
}
