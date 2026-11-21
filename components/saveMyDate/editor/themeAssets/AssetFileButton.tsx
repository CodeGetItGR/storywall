'use client';

import { Upload } from 'lucide-react';
import { type ChangeEvent, useCallback, useId } from 'react';

import { SECONDARY_BUTTON_CLASS } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { THEME_ASSET_ACCEPT } from '@/lib/invitation/themeAssets';
import { cn } from '@/lib/utils';

type AssetFileButtonProps = {
    label: string;
    onFiles: (files: File[]) => void;
    multiple?: boolean;
    disabled?: boolean;
    className?: string;
};

// A button that opens the file picker for theme images.
export function AssetFileButton({ label, onFiles, multiple = false, disabled = false, className }: AssetFileButtonProps) {
    const id = useId();
    const change = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files ?? []);
            // The same file can be picked again after a failed upload.
            event.target.value = '';
            if (files.length) onFiles(files);
        },
        [onFiles],
    );

    return (
        <label htmlFor={id} className={cn(SECONDARY_BUTTON_CLASS, 'cursor-pointer', disabled && 'pointer-events-none opacity-50', className)}>
            <Upload aria-hidden="true" />
            {label}
            <input id={id} type="file" accept={THEME_ASSET_ACCEPT} multiple={multiple} disabled={disabled} onChange={change} className="sr-only" />
        </label>
    );
}
