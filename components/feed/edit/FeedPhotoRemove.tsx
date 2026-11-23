'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

// The ✕ on a photo the host added into a block, in edit mode only (Open question 7).
export function FeedPhotoRemove({ elementId, onRemove }: { elementId: string; onRemove: (elementId: string) => void }) {
    const t = useTranslations('InvitationEditor.sections');
    const remove = useCallback(() => onRemove(elementId), [elementId, onRemove]);
    return (
        <button
            type="button"
            onClick={remove}
            aria-label={t('delete')}
            title={t('delete')}
            className="absolute top-1.5 right-1.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-ink shadow-sm"
        >
            <X className="h-4 w-4" aria-hidden="true" />
        </button>
    );
}
