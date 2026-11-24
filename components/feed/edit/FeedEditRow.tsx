'use client';

import { Eye, Palette, Save, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Ref } from 'react';

import { cn } from '@/lib/utils';

type FeedEditRowProps = {
    saving: boolean;
    failed: boolean;
    // Absent: no Theme button (an event without Save my date, plan 8).
    onTheme?: () => void;
    // Showing the feed as guests will see it.
    previewing: boolean;
    onPreview: () => void;
    onCancel: () => void;
    onSave: () => void;
    cancelRef?: Ref<HTMLButtonElement>;
};

// Smaller and tighter on phones, so all four fit at 360 in Greek, saving too. Each has a 40 px tap area.
const SHAPE =
    'relative inline-flex h-8 items-center rounded-full text-[12.5px] whitespace-nowrap before:absolute before:-inset-y-1 before:inset-x-0 disabled:opacity-60 sm:h-9 sm:text-sm';
const SHADOW = 'shadow-[0_2px_8px_rgba(36,31,26,0.14)]';
const BUTTON = cn(SHAPE, SHADOW, 'gap-1 px-2 sm:gap-1.5 sm:px-3.5');
const PLAIN = cn(BUTTON, 'border border-[#ffcfa6] bg-white font-medium text-ink');
const ICON = 'h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4';

// Edit mode's Theme, preview eye, Cancel and Save (mockup 2026-11-24): a row under the cover, the save error under it,
// then a dashed line across the page.
export function FeedEditRow({ saving, failed, onTheme, previewing, onPreview, onCancel, onSave, cancelRef }: FeedEditRowProps) {
    const t = useTranslations('InvitationEditor');
    const tFeed = useTranslations('FeedEditor');
    const previewLabel = previewing ? tFeed('edit') : t('preview');

    return (
        <div className="flex flex-col gap-2 border-b border-dashed border-black/15 px-3 pt-3 pb-4 font-sans sm:px-4">
            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-2 sm:gap-x-2">
                {/* Theme and preview. Theme keeps its place while previewing, so the eye stays under the finger. */}
                <div className="flex gap-1 sm:gap-2">
                    {onTheme && (
                        <button
                            type="button"
                            onClick={onTheme}
                            disabled={saving}
                            className={cn(
                                BUTTON,
                                'font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90',
                                previewing && 'invisible',
                            )}
                        >
                            <Palette className={ICON} aria-hidden="true" />
                            {tFeed('themes')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onPreview}
                        disabled={saving}
                        aria-pressed={previewing}
                        aria-label={previewLabel}
                        title={previewLabel}
                        className={cn(SHAPE, SHADOW, 'w-8 justify-center sm:w-9', previewing ? 'bg-ink text-white' : 'bg-white text-ink')}
                    >
                        <Eye className={ICON} aria-hidden="true" />
                    </button>
                </div>

                {/* Cancel and Save */}
                <div className="ml-auto flex gap-1 sm:gap-2">
                    <button ref={cancelRef} type="button" onClick={onCancel} disabled={saving} className={PLAIN}>
                        <X className={ICON} aria-hidden="true" />
                        {t('cancel')}
                    </button>
                    <button type="button" onClick={onSave} disabled={saving} aria-busy={saving} className={PLAIN}>
                        <Save className={cn(ICON, 'text-[#17917f]')} aria-hidden="true" />
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
