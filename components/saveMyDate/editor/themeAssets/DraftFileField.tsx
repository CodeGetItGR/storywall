'use client';

import { useCallback } from 'react';

import { AssetSlot } from '@/components/saveMyDate/editor/themeAssets/AssetSlot';

type DraftFileFieldProps<K extends string> = {
    fileKey: K;
    label: string;
    src?: string;
    onPick: (key: K, file: File | null) => void;
    disabled: boolean;
};

// One file of a frame or transition that hasn't been added yet.
export function DraftFileField<K extends string>({ fileKey, label, src, onPick, disabled }: DraftFileFieldProps<K>) {
    const change = useCallback((file: File | null) => onPick(fileKey, file), [fileKey, onPick]);
    return <AssetSlot label={label} src={src} onFile={change} isBusy={disabled} />;
}
