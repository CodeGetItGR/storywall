'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useMemo, useRef } from 'react';

import { useFilePreviews } from '@/hooks/useFilePreviews';

// An image picker in the vendor profile sheet (the logo, the banner): a hidden file input opened by a button.
// Shows the chosen file, else the saved image unless it is marked for removal.
export function useVendorImagePicker({
    file,
    currentUrl,
    remove,
    setFile,
    setRemove,
}: {
    file: File | null;
    currentUrl: string | null;
    remove: boolean;
    setFile: (file: File | null) => void;
    setRemove: (remove: boolean) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const files = useMemo(() => (file ? [file] : []), [file]);
    const filePreviewUrl = useFilePreviews(files)[0]?.url ?? null;
    const previewUrl = filePreviewUrl ?? (remove ? null : currentUrl);

    const openPicker = useCallback(() => inputRef.current?.click(), []);

    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const picked = event.target.files?.[0] ?? null;
            if (!picked) return;
            setFile(picked);
            setRemove(false);
            event.target.value = '';
        },
        [setFile, setRemove],
    );

    const handleRemove = useCallback(() => {
        if (file) setFile(null);
        else setRemove(true);
    }, [file, setFile, setRemove]);

    return { inputRef, previewUrl, openPicker, handleChange, handleRemove };
}
