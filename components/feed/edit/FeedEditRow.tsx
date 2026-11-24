'use client';

import { Palette, Save, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Ref } from 'react';

import { cn } from '@/lib/utils';

type FeedEditRowProps = {
    saving: boolean;
    failed: boolean;
    // Absent: no Theme button (an event without Save my date, plan 8).
    onTheme?: () => void;
    onCancel: () => void;
    onSave: () => void;
    cancelRef?: Ref<HTMLButtonElement>;
};

// Smaller and tighter on phones, so all three fit at 360 in Greek, saving too.
const BUTTON =
    'inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[13px] whitespace-nowrap shadow-sm disabled:opacity-60 sm:h-9 sm:gap-1.5 sm:px-3.5 sm:text-sm';
const PLAIN = cn(BUTTON, 'border border-black/10 bg-white font-medium text-ink');
const ICON = 'h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4';

// Edit mode's Theme, Cancel and Save, as a row under the cover (under the pill when it shows), with the save error under it.
export function FeedEditRow({ saving, failed, onTheme, onCancel, onSave, cancelRef }: FeedEditRowProps) {
    const t = useTranslations('InvitationEditor');
    const tFeed = useTranslations('FeedEditor');

    return (
        <div className="flex flex-col gap-2 px-4 pt-3 font-sans">
            {/* Actions */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                {/* Theme */}
                {onTheme ? (
                    <button
                        type="button"
                        onClick={onTheme}
                        disabled={saving}
                        className={cn(BUTTON, 'font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90')}
                    >
                        <Palette className={ICON} aria-hidden="true" />
                        {tFeed('themes')}
                    </button>
                ) : (
                    <span />
                )}

                {/* Cancel and Save */}
                <div className="flex gap-1.5 sm:gap-2">
                    <button ref={cancelRef} type="button" onClick={onCancel} disabled={saving} className={PLAIN}>
                        <X className={ICON} aria-hidden="true" />
                        {t('cancel')}
                    </button>
                    <button type="button" onClick={onSave} disabled={saving} aria-busy={saving} className={PLAIN}>
                        <Save className={ICON} aria-hidden="true" />
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
