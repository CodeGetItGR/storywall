'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useMemo, useRef } from 'react';

import { useFilePreviews } from '@/hooks/useFilePreviews';

// The logo picker in the vendor profile sheet: a hidden file input opened by a button.
// Shows the chosen file, else the saved logo unless it is marked for removal.
export function useVendorLogoPicker({
    file,
    currentLogoUrl,
    removeLogo,
    setLogo,
    setRemoveLogo,
}: {
    file: File | null;
    currentLogoUrl: string | null;
    removeLogo: boolean;
    setLogo: (file: File | null) => void;
    setRemoveLogo: (remove: boolean) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const files = useMemo(() => (file ? [file] : []), [file]);
    const filePreviewUrl = useFilePreviews(files)[0]?.url ?? null;
    const previewUrl = filePreviewUrl ?? (removeLogo ? null : currentLogoUrl);

    const openPicker = useCallback(() => inputRef.current?.click(), []);

    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const picked = event.target.files?.[0] ?? null;
            if (!picked) return;
            setLogo(picked);
            setRemoveLogo(false);
            event.target.value = '';
        },
        [setLogo, setRemoveLogo],
    );

    const handleRemove = useCallback(() => {
        if (file) setLogo(null);
        else setRemoveLogo(true);
    }, [file, setLogo, setRemoveLogo]);

    return { inputRef, previewUrl, openPicker, handleChange, handleRemove };
}
