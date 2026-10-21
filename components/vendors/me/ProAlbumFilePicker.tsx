'use client';

import { ImagePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback } from 'react';

// Photos and videos for the Pro album; the upload itself starts from the section's button.
export function ProAlbumFilePicker({ onChooseAction }: { onChooseAction: (files: File[]) => void }) {
    const t = useTranslations('Vendors');
    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            onChooseAction(Array.from(event.target.files ?? []));
            // So choosing the same files again still fires a change.
            event.target.value = '';
        },
        [onChooseAction],
    );

    return (
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-ink focus-within:ring-2">
            <ImagePlus className="size-4" aria-hidden="true" />
            {t('me.proChoose')}
            <input type="file" multiple accept="image/*,video/*" className="sr-only" onChange={handleChange} />
        </label>
    );
}
