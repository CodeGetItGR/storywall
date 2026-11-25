'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { FeedAddPlace } from '@/lib/feedEditing';

// "+ Add section" on a dotted line, after each of the host's blocks (spec item 8). Edit mode only.
export function FeedAddBetween({ onAdd }: { onAdd: () => void }) {
    const t = useTranslations('InvitationEditor.sections');

    return (
        <div className="on-page flex items-center gap-3 px-4 py-2">
            {/* Dotted line */}
            <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-ink/25" />
            {/* Add section */}
            <button
                type="button"
                onClick={onAdd}
                className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('add')}
            </button>
            <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-ink/25" />
        </div>
    );
}

// One row, opening the Add section sheet for its place.
export function FeedEditAddBetween({ place, onOpen }: { place: FeedAddPlace; onOpen: (place: FeedAddPlace) => void }) {
    const open = useCallback(() => onOpen(place), [onOpen, place]);
    return <FeedAddBetween onAdd={open} />;
}
