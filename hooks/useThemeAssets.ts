'use client';

import { useCallback, useState } from 'react';

import type { InvitationEditorStore, ThemeShare } from '@/lib/invitation/editorStore';
import type { ImageUploader, UploadedImage } from '@/lib/invitation/editorUploads';
import type { ThemeDesign } from '@/lib/invitation/theme';
import {
    addElement,
    addFrame,
    addTransition,
    type ArtSlot,
    type BackgroundDevice,
    nameFromFile,
    newThemeItemId,
    removeThemeItem,
    renameThemeItem,
    setArtImage,
    setBackgroundImage,
    setShareImage,
    type ThemeListKind,
} from '@/lib/invitation/themeAssets';
import type { BackgroundSlot } from '@/lib/invitation/themeEditing';

type ThemeAssetsOptions = {
    store: InvitationEditorStore;
    design: ThemeDesign;
    share: ThemeShare;
    uploadImage: ImageUploader;
    // Makes a new upload show before the theme is saved.
    addUploaded: (mediaId: string, url: string) => void;
    // A removed image's file is deleted after the next save that no longer uses it.
    markRemoved: (assetId: string) => void;
};

// The theme's images in the admin's theme editor: upload, replace and remove them, and add
// elements, frames and transitions. Every change is an undo step; uploads go to the theme at once.
export function useThemeAssets({ store, design, share, uploadImage, addUploaded, markRemoved }: ThemeAssetsOptions) {
    // The slot an upload is on its way to, and the one whose upload failed.
    const [busy, setBusy] = useState<string | null>(null);
    const [failed, setFailed] = useState<string | null>(null);

    const upload = useCallback(
        async (key: string, files: readonly File[]): Promise<UploadedImage[] | null> => {
            setBusy(key);
            setFailed(null);
            try {
                const saved: UploadedImage[] = [];
                for (const file of files) {
                    const image = await uploadImage(file);
                    addUploaded(image.mediaId, image.url);
                    saved.push(image);
                }
                return saved;
            } catch {
                setFailed(key);
                return null;
            } finally {
                setBusy(null);
            }
        },
        [addUploaded, uploadImage],
    );

    const replaced = useCallback((previous: string | undefined | null) => previous && markRemoved(previous), [markRemoved]);

    const setBackground = useCallback(
        async (slot: BackgroundSlot, device: BackgroundDevice, file: File | null) => {
            const previous = design.backgrounds[slot][device]?.mediaId;
            const image = file ? (await upload(`background.${slot}.${device}`, [file]))?.[0] : null;
            if (file && !image) return;
            store.getState().editTheme((theme) => setBackgroundImage(theme, slot, device, image?.mediaId ?? null));
            replaced(previous);
        },
        [design.backgrounds, replaced, store, upload],
    );

    const setArt = useCallback(
        async (slot: ArtSlot, file: File | null) => {
            const previous = design.art[slot]?.image.mediaId;
            const image = file ? (await upload(`art.${slot}`, [file]))?.[0] : null;
            if (file && !image) return;
            store.getState().editTheme((theme) => setArtImage(theme, slot, image?.mediaId ?? null));
            replaced(previous);
        },
        [design.art, replaced, store, upload],
    );

    const setShare = useCallback(
        async (file: File | null) => {
            const previous = share.imageId;
            const image = file ? (await upload('share', [file]))?.[0] : null;
            if (file && !image) return;
            store.getState().editTheme((_theme, _document, draftShare) => setShareImage(draftShare, image?.mediaId ?? null));
            replaced(previous);
        },
        [replaced, share.imageId, store, upload],
    );

    // Each file is one element, named after the file.
    const addElements = useCallback(
        async (files: readonly File[]) => {
            const images = await upload('elements', files);
            if (!images) return;
            store.getState().editTheme((theme) => {
                images.forEach((image, index) =>
                    addElement(theme, { id: newThemeItemId('element'), name: nameFromFile(files[index]), mediaId: image.mediaId }),
                );
            });
        },
        [store, upload],
    );

    const addFrameFrom = useCallback(
        async (name: string, art: File, mask: File) => {
            const images = await upload('frames', [art, mask]);
            if (!images) return false;
            const [artImage, maskImage] = images;
            store.getState().editTheme((theme) =>
                addFrame(theme, {
                    id: newThemeItemId('frame'),
                    name: name.trim() || nameFromFile(art),
                    art: artImage.mediaId,
                    mask: maskImage.mediaId,
                    width: artImage.width ?? 1,
                    height: artImage.height ?? 1,
                }),
            );
            return true;
        },
        [store, upload],
    );

    const addTransitionFrom = useCallback(
        async (name: string, desktop: File, mobile: File | null) => {
            const images = await upload('transitions', mobile ? [desktop, mobile] : [desktop]);
            if (!images) return false;
            store.getState().editTheme((theme) =>
                addTransition(theme, {
                    id: newThemeItemId('transition'),
                    name: name.trim() || nameFromFile(desktop),
                    desktop: images[0].mediaId,
                    mobile: images[1]?.mediaId ?? null,
                }),
            );
            return true;
        },
        [store, upload],
    );

    const rename = useCallback(
        (kind: ThemeListKind, id: string, name: string) =>
            store.getState().editTheme((theme) => renameThemeItem(theme, kind, id, name), `theme.${kind}.${id}.name`),
        [store],
    );

    const remove = useCallback(
        (kind: ThemeListKind, id: string) => {
            const item = design[kind].find((entry) => entry.id === id);
            if (!item) return;
            store.getState().editTheme((theme, document) => removeThemeItem(theme, document, kind, id));
            for (const ref of Object.values(item)) {
                if (ref && typeof ref === 'object' && 'mediaId' in ref) markRemoved(ref.mediaId);
            }
        },
        [design, markRemoved, store],
    );

    return { busy, failed, setBackground, setArt, setShare, addElements, addFrame: addFrameFrom, addTransition: addTransitionFrom, rename, remove };
}

export type ThemeAssets = ReturnType<typeof useThemeAssets>;
