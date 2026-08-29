'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useDeleteMedia, useUploadMedia, useUploadMediaBatch } from '@/hooks/useMedia';
import { useCreateStoriesBatch } from '@/hooks/useStories';
import type { MediaBatchUploadResponseDto } from '@/lib/api/types';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

export type PendingStoryStatus = 'ready' | 'uploading' | 'uploaded' | 'posting' | 'failed';

export interface PendingStory {
    key: string;
    file: File;
    previewUrl: string;
    /** Set once a video finishes its eager background upload — lets the preview play the
     * real hosted file instead of the local blob, which some Android browsers can't decode. */
    remoteUrl?: string;
    caption: string;
    status: PendingStoryStatus;
    mediaId?: string;
    error?: string;
}

export interface StoryComposerController {
    isOpen: boolean;
    items: PendingStory[];
    activeKey: string | null;
    activeItem: PendingStory | null;
    isBusy: boolean;
    canSubmit: boolean;
    error: string | null;
    notice: string | null;
    maxItems: number;
    maxCaptionLength: number;
    libraryInputRef: React.RefObject<HTMLInputElement | null>;
    photoInputRef: React.RefObject<HTMLInputElement | null>;
    videoInputRef: React.RefObject<HTMLInputElement | null>;
    open: () => void;
    close: () => void;
    pickFromLibrary: () => void;
    takePhoto: () => void;
    recordVideo: () => void;
    handleLibraryChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handlePhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleVideoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    addCapturedFile: (file: File) => void;
    selectItem: (key: string) => void;
    removeItem: (key: string) => void;
    updateCaption: (value: string) => void;
    submit: (event: React.SubmitEvent<HTMLFormElement>) => Promise<void>;
}

function mapBatchUploads(items: PendingStory[], result: MediaBatchUploadResponseDto): PendingStory[] {
    const createdByName = new Map<string, typeof result.created>();
    result.created.forEach((media) => createdByName.set(media.originalFilename, [...(createdByName.get(media.originalFilename) ?? []), media]));

    const failedByName = new Map<string, typeof result.failed>();
    result.failed.forEach((failure) => failedByName.set(failure.filename, [...(failedByName.get(failure.filename) ?? []), failure]));

    return items.map((item) => {
        if (item.mediaId) return item;
        const failure = failedByName.get(item.file.name)?.shift();
        if (failure) return { ...item, status: 'failed', error: failure.message };
        const media = createdByName.get(item.file.name)?.shift();
        return media ? { ...item, mediaId: media.id, status: 'uploaded', error: undefined } : item;
    });
}

export function useStoryComposerController(canCompose: boolean): StoryComposerController {
    const t = useTranslations('StoryComposer');
    const toErrorMessage = useApiErrorMessage();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const { data: appConfig } = useAppConfig();
    const uploadBatch = useUploadMediaBatch();
    const uploadSingle = useUploadMedia();
    const deleteMedia = useDeleteMedia(activeEvent?.id ?? '');
    const createStories = useCreateStoriesBatch();
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<PendingStory[]>([]);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const libraryInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const itemsRef = useRef<PendingStory[]>([]);

    const maxItems = Math.min(appConfig?.media.maxBatchStoryItems ?? 5, appConfig?.media.maxBatchUploadFiles ?? 10);
    const maxCaptionLength = appConfig?.contentLimits.storyCaptionMaxLength ?? 300;
    const maxImageBytes = appConfig?.media.maxImageBytes ?? 25 * 1024 * 1024;
    const maxVideoBytes = appConfig?.media.maxVideoBytes ?? 200 * 1024 * 1024;
    const maxRequestSizeBytes = appConfig?.media.maxRequestSizeBytes ?? 260 * 1024 * 1024;
    const isBusy = uploadBatch.isPending || createStories.isPending;
    const activeItem = items.find((item) => item.key === activeKey) ?? items[0] ?? null;

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    useEffect(
        () => () =>
            itemsRef.current.forEach((item) => {
                URL.revokeObjectURL(item.previewUrl);
                if (item.mediaId) deleteMedia.mutate(item.mediaId);
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const reset = useCallback(() => {
        itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        setItems([]);
        setActiveKey(null);
        setError(null);
        setNotice(null);
    }, []);

    const open = useCallback(() => {
        if (!canCompose) return;
        setError(null);
        setNotice(null);
        setIsOpen(true);
    }, [canCompose]);

    // Eagerly-uploaded videos (see addFiles) that never made it into a posted
    // story would otherwise sit orphaned in storage — clean them up here.
    function close() {
        if (isBusy) return;
        itemsRef.current.forEach((item) => {
            if (item.mediaId) deleteMedia.mutate(item.mediaId);
        });
        reset();
        setIsOpen(false);
    }

    function addFiles(fileList: FileList | File[] | null) {
        if (!fileList?.length || !canCompose) return;
        setError(null);
        setNotice(null);

        const room = maxItems - items.length;
        const currentBytes = items.reduce((total, item) => total + (item.mediaId ? 0 : item.file.size), 0);
        let acceptedBytes = 0;
        const accepted: File[] = [];
        let rejectedForSize = false;

        for (const file of Array.from(fileList).slice(0, Math.max(room, 0))) {
            const fileLimit = file.type.startsWith('video/') ? maxVideoBytes : maxImageBytes;
            if (file.size > fileLimit || currentBytes + acceptedBytes + file.size > maxRequestSizeBytes) {
                rejectedForSize = true;
                continue;
            }
            accepted.push(file);
            acceptedBytes += file.size;
        }

        if (fileList.length > room) setError(t('maxItems', { count: maxItems }));
        else if (rejectedForSize) setError(t('filesTooLarge'));

        if (accepted.length === 0) return;
        const next = accepted.map((file) => ({
            key: `${file.name}-${file.size}-${Date.now()}-${crypto.randomUUID()}`,
            file,
            previewUrl: URL.createObjectURL(file),
            caption: '',
            status: 'ready' as const,
        }));
        setItems((current) => [...current, ...next]);
        setActiveKey(next[0].key);

        // Some Android browsers can't decode a locally-picked video's blob: URL
        // (e.g. HEVC clips routed through the platform decoder). Upload videos
        // in the background right away so the preview can switch to the real
        // hosted URL, which plays fine, once it's ready.
        if (activeEvent && activeMember) {
            for (const item of next) {
                if (!item.file.type.startsWith('video/')) continue;
                uploadSingle.mutate(
                    { eventId: activeEvent.id, file: item.file, uploaderMemberId: activeMember.id },
                    {
                        onSuccess: (media) => {
                            setItems((current) =>
                                current.map((existing) =>
                                    existing.key === item.key ? { ...existing, mediaId: media.id, remoteUrl: media.mediaUrl } : existing
                                )
                            );
                        },
                    }
                );
            }
        }
    }

    function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        addFiles(event.target.files);
        event.target.value = '';
    }

    function removeItem(key: string) {
        if (isBusy) return;
        const targetIndex = items.findIndex((item) => item.key === key);
        const target = items[targetIndex];
        if (!target) return;
        URL.revokeObjectURL(target.previewUrl);
        if (target.mediaId) deleteMedia.mutate(target.mediaId);
        const remaining = items.filter((item) => item.key !== key);
        setItems(remaining);
        if (activeKey === key) setActiveKey(remaining[Math.min(targetIndex, remaining.length - 1)]?.key ?? null);
    }

    function updateActive(patch: Pick<PendingStory, 'caption'>) {
        if (!activeItem || isBusy) return;
        setItems((current) => current.map((item) => (item.key === activeItem.key ? { ...item, ...patch, error: undefined } : item)));
    }

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!activeEvent || !activeMember || items.length === 0 || isBusy) return;
        setError(null);
        setNotice(null);

        let working: PendingStory[] = items.map((item) => ({
            ...item,
            status: item.mediaId ? 'uploaded' : 'uploading',
            error: undefined,
        }));
        setItems(working);

        const toUpload = working.filter((item) => !item.mediaId);
        if (toUpload.length > 0) {
            try {
                const result = await uploadBatch.mutateAsync({
                    eventId: activeEvent.id,
                    files: toUpload.map((item) => item.file),
                    uploaderMemberId: activeMember.id,
                });
                working = mapBatchUploads(working, result);
                setItems(working);
            } catch (cause) {
                const message = toErrorMessage(cause, t('uploadFailed'));
                working = working.map((item) => (!item.mediaId ? { ...item, status: 'failed' as const, error: message } : item));
                setItems(working);
                setError(message);
            }
        }

        const readyToPost = working.filter((item) => item.mediaId && item.status !== 'failed');
        if (readyToPost.length === 0) return;
        setItems((current) =>
            current.map((item) => (readyToPost.some((candidate) => candidate.key === item.key) ? { ...item, status: 'posting' } : item))
        );

        try {
            const result = await createStories.mutateAsync(
                readyToPost.map((item) => ({
                    eventId: activeEvent.id,
                    authorMemberId: activeMember.id,
                    mediaId: item.mediaId!,
                    caption: item.caption.trim() || undefined,
                }))
            );
            const failedByMediaId = new Map(result.failed.map((failure) => [failure.mediaId, failure.message]));
            const successfulMediaIds = new Set(result.created.map((story) => story.mediaId));
            const remaining = working
                .filter((item) => !item.mediaId || !successfulMediaIds.has(item.mediaId))
                .map((item) => {
                    const failure = item.mediaId ? failedByMediaId.get(item.mediaId) : undefined;
                    return failure ? { ...item, status: 'failed' as const, error: failure } : item;
                });

            working.filter((item) => item.mediaId && successfulMediaIds.has(item.mediaId)).forEach((item) => URL.revokeObjectURL(item.previewUrl));
            if (remaining.length === 0) {
                reset();
                setIsOpen(false);
                return;
            }
            setItems(remaining);
            setActiveKey(remaining[0]?.key ?? null);
            setNotice(t('partialSuccess', { posted: result.created.length, failed: remaining.length }));
        } catch (cause) {
            const message = toErrorMessage(cause, t('postFailed'));
            setItems((current) => current.map((item) => (item.mediaId ? { ...item, status: 'failed', error: message } : item)));
            setError(message);
        }
    }

    return {
        isOpen,
        items,
        activeKey,
        activeItem,
        isBusy,
        canSubmit: items.length > 0 && !isBusy && canCompose,
        error,
        notice,
        maxItems,
        maxCaptionLength,
        libraryInputRef,
        photoInputRef,
        videoInputRef,
        open,
        close,
        pickFromLibrary: () => libraryInputRef.current?.click(),
        takePhoto: () => photoInputRef.current?.click(),
        recordVideo: () => videoInputRef.current?.click(),
        handleLibraryChange: handleInputChange,
        handlePhotoChange: handleInputChange,
        handleVideoChange: handleInputChange,
        addCapturedFile: (file) => addFiles([file]),
        selectItem: setActiveKey,
        removeItem,
        updateCaption: (value) => updateActive({ caption: value.slice(0, maxCaptionLength) }),
        submit,
    };
}
