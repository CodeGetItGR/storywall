'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

type FeedAddSectionRowProps = { onAdd: () => void };

// The end of the middle: add a Save my date block.
export function FeedAddSectionRow({ onAdd }: FeedAddSectionRowProps) {
    const t = useTranslations('InvitationEditor.sections');

    return (
        <div className="px-4 py-3">
            {/* Add section */}
            <button
                type="button"
                onClick={onAdd}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('add')}
            </button>
        </div>
    );
}
