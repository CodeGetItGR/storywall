'use client';

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

// A new frame or transition being put together: its name and files, previewed before the
// upload. `required` are the files it can't be added without.
export function useThemeAssetDraft<K extends string>(
    required: readonly K[],
    add: (name: string, files: Partial<Record<K, File>>) => Promise<boolean>,
) {
    const [name, setName] = useState('');
    const [files, setFiles] = useState<Partial<Record<K, File>>>({});
    const [isAdding, setIsAdding] = useState(false);

    const previews = useMemo(() => {
        const urls: Partial<Record<K, string>> = {};
        for (const key of Object.keys(files) as K[]) {
            const file = files[key];
            if (file) urls[key] = URL.createObjectURL(file);
        }
        return urls;
    }, [files]);
    useEffect(
        () => () => {
            for (const url of Object.values(previews)) URL.revokeObjectURL(url as string);
        },
        [previews],
    );

    const changeName = useCallback((event: ChangeEvent<HTMLInputElement>) => setName(event.target.value), []);
    const pick = useCallback((key: K, file: File | null) => setFiles((current) => ({ ...current, [key]: file ?? undefined })), []);
    const canAdd = required.every((key) => files[key]) && !isAdding;

    const submit = useCallback(async () => {
        setIsAdding(true);
        const added = await add(name, files);
        setIsAdding(false);
        if (!added) return;
        setName('');
        setFiles({});
    }, [add, files, name]);

    return { name, changeName, files, previews, pick, canAdd, isAdding, submit };
}

const FRAME_FILES = ['art', 'mask'] as const;
const TRANSITION_FILES = ['desktop'] as const;

// A new frame needs its art and its mask.
export function useFrameDraft(addFrame: (name: string, art: File, mask: File) => Promise<boolean>) {
    const add = useCallback(
        async (name: string, files: Partial<Record<'art' | 'mask', File>>) =>
            files.art && files.mask ? addFrame(name, files.art, files.mask) : false,
        [addFrame],
    );
    return useThemeAssetDraft<'art' | 'mask'>(FRAME_FILES, add);
}

// A new transition needs its desktop image; the mobile one is optional.
export function useTransitionDraft(addTransition: (name: string, desktop: File, mobile: File | null) => Promise<boolean>) {
    const add = useCallback(
        async (name: string, files: Partial<Record<'desktop' | 'mobile', File>>) =>
            files.desktop ? addTransition(name, files.desktop, files.mobile ?? null) : false,
        [addTransition],
    );
    return useThemeAssetDraft<'desktop' | 'mobile'>(TRANSITION_FILES, add);
}
