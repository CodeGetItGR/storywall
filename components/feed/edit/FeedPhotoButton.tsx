'use client';

import { ImagePlus } from 'lucide-react';
import { type ChangeEvent, useCallback } from 'react';

import { SECONDARY_BUTTON_CLASS } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { PHOTO_ACCEPT } from '@/lib/invitation/photoUpload';
import { cn } from '@/lib/utils';

type FeedPhotoButtonProps = { label: string; uploading: boolean; onPick: (file: File) => void };

// A settings button that opens the file picker.
export function FeedPhotoButton({ label, uploading, onPick }: FeedPhotoButtonProps) {
    const pick = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onPick(file);
        },
        [onPick],
    );

    return (
        <label
            aria-busy={uploading}
            className={cn(
                SECONDARY_BUTTON_CLASS,
                'cursor-pointer focus-within:ring-2 focus-within:ring-primary',
                uploading && 'pointer-events-none opacity-50',
            )}
        >
            <ImagePlus aria-hidden="true" />
            {label}
            <input type="file" accept={PHOTO_ACCEPT} disabled={uploading} onChange={pick} className="sr-only" />
        </label>
    );
}
