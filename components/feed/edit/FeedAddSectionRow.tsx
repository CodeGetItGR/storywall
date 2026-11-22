'use client';

import { Lock, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

type FeedAddSectionRowProps = { locked: boolean; canBuy: boolean; onAdd: () => void };

// The end of the middle: add a Save my date block, or the lock when the event has no Save my date.
export function FeedAddSectionRow({ locked, canBuy, onAdd }: FeedAddSectionRowProps) {
    const t = useTranslations('InvitationEditor.sections');
    const tTheme = useTranslations('ManagePage.settings.theme');

    // A co-host can't buy Save my date: only the lock shows.
    if (locked && !canBuy) {
        return (
            <p className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-ink-muted">
                <Lock className="h-4 w-4" aria-hidden="true" />
                {tTheme('locked')}
            </p>
        );
    }

    return (
        <div className="px-4 py-3">
            {/* Add section */}
            <button
                type="button"
                onClick={onAdd}
                className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
                <span className="flex items-center gap-2">
                    {locked ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                    {t('add')}
                </span>
                {locked && <span className="text-xs font-normal text-ink-muted">{tTheme('locked')}</span>}
            </button>
        </div>
    );
}
