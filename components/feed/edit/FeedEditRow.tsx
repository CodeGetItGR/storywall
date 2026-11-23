'use client';

import { Palette, Save, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Ref } from 'react';

type FeedEditRowProps = {
    saving: boolean;
    failed: boolean;
    // Absent: no Theme button (an event without Save my date, plan 8).
    onTheme?: () => void;
    onCancel: () => void;
    onSave: () => void;
    cancelRef?: Ref<HTMLButtonElement>;
};

const PLAIN = 'inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 text-sm font-medium text-ink shadow-sm disabled:opacity-60';

// Edit mode's Theme, Cancel and Save, as a row under the cover (under the pill when it shows), with the save error under it.
export function FeedEditRow({ saving, failed, onTheme, onCancel, onSave, cancelRef }: FeedEditRowProps) {
    const t = useTranslations('InvitationEditor');
    const tFeed = useTranslations('FeedEditor');

    return (
        <div className="flex flex-col gap-2 px-4 pt-3 font-sans">
            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
                {/* Theme */}
                {onTheme ? (
                    <button
                        type="button"
                        onClick={onTheme}
                        disabled={saving}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-white shadow-sm transition-opacity bg-gradient-brand hover:opacity-90 disabled:opacity-60"
                    >
                        <Palette className="h-4 w-4" aria-hidden="true" />
                        {tFeed('themes')}
                    </button>
                ) : (
                    <span />
                )}

                {/* Cancel and Save */}
                <div className="flex gap-2">
                    <button ref={cancelRef} type="button" onClick={onCancel} disabled={saving} className={PLAIN}>
                        <X className="h-4 w-4" aria-hidden="true" />
                        {t('cancel')}
                    </button>
                    <button type="button" onClick={onSave} disabled={saving} aria-busy={saving} className={PLAIN}>
                        <Save className="h-4 w-4" aria-hidden="true" />
                        {saving ? t('saving') : t('save')}
                    </button>
                </div>
            </div>

            {/* Save error */}
            {failed && (
                <div role="alert" className="self-end rounded-xl bg-background/95 px-3 py-2 text-right text-sm text-destructive shadow-sm">
                    {tFeed('saveFailed')}
                </div>
            )}
        </div>
    );
}
