'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCreatePost, useCreateStory, useUploadMedia, useUploadMediaBatch } from '@/hooks';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventModules } from '@/hooks/useEventModules';
import { useCreatePlaylistSuggestion } from '@/hooks/usePlaylist';
import { ERROR_CODES, getErrorCode, getQuotaExceededDetails, isModuleNotAvailableError } from '@/lib/api/errors';
import { isEventWritable } from '@/lib/eventLifecycle';
import { findNextPlan } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { initialsFromName } from '@/lib/utils';
import type { ComposerContextValue } from '@/providers/composer/ComposerContext';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

type ComposerMode = 'post' | 'song';

export interface PendingImage {
    key: string;
    file: File;
    previewUrl: string;
    status: 'pending' | 'uploading' | 'uploaded' | 'failed';
    mediaId?: string;
    error?: string;
}

export interface ComposerController {
    contextValue: ComposerContextValue;
    isOpen: boolean;
    composerMode: ComposerMode;
    caption: string;
    images: PendingImage[];
    sizeError: string | null;
    countError: string | null;
    submitError: string | null;
    storyError: string | null;
    songComposerKey: number;
    fileRef: React.RefObject<HTMLInputElement | null>;
    storyInputRef: React.RefObject<HTMLInputElement | null>;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    memberName: string;
    hasUnresolvedFailures: boolean;
    isPostBusy: boolean;
    isSongBusy: boolean;
    canSubmit: boolean;
    canComposePost: boolean;
    canComposeStory: boolean;
    canComposeSong: boolean;
    maxImages: number;
    initials: string;
    openPostComposer: () => void;
    openSongComposer: () => void;
    openStoryCapture: () => void;
    selectPostMode: () => void;
    selectSongMode: () => void;
    closeComposer: () => void;
    handleCaptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handlePickPhotos: () => void;
    handlePostFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveImageClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    handleRetryUploadClick: () => void;
    submitPost: (event: React.SubmitEvent<HTMLFormElement>) => Promise<void>;
    submitPlaylistSuggestion: (input: {
        title: string;
        artist?: string;
        youtubeUrl?: string;
        spotifyUrl?: string;
        comment?: string;
    }) => Promise<void>;
    handleStoryFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

function formatBytes(bytes: number): string {
    const megabytes = bytes / (1024 * 1024);
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}

export function useComposerController(): ComposerController {
    const t = useTranslations('ComposerCard');
    const toErrorMessage = useApiErrorMessage();
    const router = useRouter();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const { data: eventModules = [] } = useEventModules(activeEvent?.id ?? null);
    const { data: appConfig } = useAppConfig();
    const createPost = useCreatePost();
    const uploadBatch = useUploadMediaBatch();
    const uploadMedia = useUploadMedia();
    const createStory = useCreateStory();
    const createPlaylistSuggestion = useCreatePlaylistSuggestion();

    const [isOpen, setIsOpen] = useState(false);
    const [composerMode, setComposerMode] = useState<ComposerMode>('post');
    const [caption, setCaption] = useState('');
    const [images, setImages] = useState<PendingImage[]>([]);
    const [sizeError, setSizeError] = useState<string | null>(null);
    const [countError, setCountError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [storyError, setStoryError] = useState<string | null>(null);
    const [songComposerKey, setSongComposerKey] = useState(0);
    const fileRef = useRef<HTMLInputElement>(null);
    const storyInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!isOpen || composerMode !== 'post') return;
        const raf = requestAnimationFrame(() => textareaRef.current?.focus());
        return () => cancelAnimationFrame(raf);
    }, [composerMode, isOpen]);

    const imagesRef = useRef<PendingImage[]>([]);
    useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    useEffect(() => {
        return () => {
            imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        };
    }, []);

    const hasUnresolvedFailures = images.some((img) => img.status === 'failed');
    const isPostBusy = createPost.isPending || uploadBatch.isPending;
    const isSongBusy = createPlaylistSuggestion.isPending;
    const canCompose = Boolean(activeMember) && isEventWritable(activeEvent?.status);
    const canComposePost = canCompose && eventModules.some((module) => module.moduleKey === 'posts' && module.isAvailable);
    const canComposeStory = canCompose && eventModules.some((module) => module.moduleKey === 'stories' && module.isAvailable);
    const canComposeSong = canCompose && eventModules.some((module) => module.moduleKey === 'playlist' && module.isAvailable);
    const maxMediaPerPost = appConfig?.media.maxMediaPerPost ?? 10;
    const maxBatchUploadFiles = appConfig?.media.maxBatchUploadFiles ?? 10;
    const maxImages = Math.min(maxMediaPerPost, maxBatchUploadFiles);
    const maxFileSizeBytes = appConfig?.media.maxFileSizeBytes ?? 20 * 1024 * 1024;
    const maxRequestSizeBytes = appConfig?.media.maxRequestSizeBytes ?? 220 * 1024 * 1024;
    const canSubmit = (caption.trim().length > 0 || images.length > 0) && !hasUnresolvedFailures && !isPostBusy && canComposePost;

    const openPostComposer = useCallback(() => {
        if (!canComposePost) return;
        setComposerMode('post');
        setIsOpen(true);
    }, [canComposePost]);

    const openSongComposer = useCallback(() => {
        if (!canComposeSong) return;
        setComposerMode('song');
        setIsOpen(true);
    }, [canComposeSong]);

    function selectPostMode() {
        setComposerMode('post');
    }

    function selectSongMode() {
        if (!canComposeSong) return;
        setComposerMode('song');
    }

    function closeComposer() {
        if (isPostBusy || isSongBusy) return;
        images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        setCaption('');
        setImages([]);
        setSizeError(null);
        setCountError(null);
        setSubmitError(null);
        setComposerMode('post');
        setSongComposerKey((current) => current + 1);
        setIsOpen(false);
    }

    function handleFiles(fileList: FileList | null) {
        if (!canComposePost) return;
        if (!fileList || fileList.length === 0) return;
        setSizeError(null);
        setCountError(null);

        const incoming = Array.from(fileList);
        const room = maxImages - images.length;
        const accepted: File[] = [];
        const oversizeNames: string[] = [];
        const existingBytes = images.reduce((sum, img) => sum + img.file.size, 0);
        let acceptedBytes = 0;
        let requestTooLarge = false;

        for (const file of incoming) {
            if (accepted.length >= room) break;
            if (file.size > maxFileSizeBytes) {
                oversizeNames.push(file.name);
                continue;
            }
            if (existingBytes + acceptedBytes + file.size > maxRequestSizeBytes) {
                requestTooLarge = true;
                continue;
            }
            accepted.push(file);
            acceptedBytes += file.size;
        }

        if (incoming.length > room) setCountError(t('maxImagesReached', { count: maxImages }));
        if (oversizeNames.length > 0) {
            setSizeError(t('fileTooLarge', { filename: oversizeNames.join(', '), size: formatBytes(maxFileSizeBytes) }));
        } else if (requestTooLarge) {
            setSizeError(t('requestTooLarge', { size: formatBytes(maxRequestSizeBytes) }));
        }

        if (accepted.length > 0) {
            setImages((prev) => [
                ...prev,
                ...accepted.map((file) => ({
                    key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
                    file,
                    previewUrl: URL.createObjectURL(file),
                    status: 'pending' as const,
                })),
            ]);
        }
    }

    function removeImage(key: string) {
        if (!canComposePost) return;
        setImages((prev) => {
            const target = prev.find((img) => img.key === key);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((img) => img.key !== key);
        });
    }

    function handleCaptionChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        setCaption(event.target.value);
    }

    function handlePickPhotos() {
        if (!canComposePost) return;
        fileRef.current?.click();
    }

    function handlePostFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
        handleFiles(event.target.files);
        event.target.value = '';
    }

    function handleRemoveImageClick(event: React.MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.dataset.key;
        if (key) removeImage(key);
    }

    function handleRetryUploadClick() {
        void uploadPendingImages();
    }

    function getComposerErrorMessage(error: unknown): string {
        if (getErrorCode(error) === ERROR_CODES.EVENT_STORAGE_LIMIT_EXCEEDED) {
            const details = getQuotaExceededDetails(error);
            const nextPlan = details ? findNextPlan(appConfig?.planTiers ?? [], 'EVENT', details.planCode) : undefined;
            return nextPlan ? t('storageLimitExceededWithPlan', { plan: nextPlan.name }) : t('storageLimitExceeded');
        }
        if (isModuleNotAvailableError(error)) {
            return t('moduleUnavailable');
        }
        return toErrorMessage(error, t('genericSubmitFailed'));
    }

    async function uploadPendingImages(): Promise<string[] | null> {
        const toUpload = images.filter((img) => img.status === 'pending' || img.status === 'failed');
        const alreadyUploaded = images.filter((img) => img.status === 'uploaded' && img.mediaId);

        if (toUpload.length === 0) {
            return alreadyUploaded.map((img) => img.mediaId!);
        }

        setImages((prev) => prev.map((img) => (toUpload.some((u) => u.key === img.key) ? { ...img, status: 'uploading', error: undefined } : img)));

        let result;
        try {
            result = await uploadBatch.mutateAsync({
                eventId: activeEvent!.id,
                files: toUpload.map((img) => img.file),
                mediaType: 'IMAGE',
                uploaderMemberId: activeMember?.id,
            });
        } catch (error) {
            const message = getComposerErrorMessage(error);
            setImages((prev) =>
                prev.map((img) =>
                    toUpload.some((u) => u.key === img.key)
                        ? {
                              ...img,
                              status: 'failed' as const,
                              error: message,
                          }
                        : img
                )
            );
            setSubmitError(message);
            return null;
        }

        const createdByName = new Map<string, typeof result.created>();
        result.created.forEach((m) => {
            const arr = createdByName.get(m.originalFilename) ?? [];
            arr.push(m);
            createdByName.set(m.originalFilename, arr);
        });
        const failedByName = new Map<string, string[]>();
        result.failed.forEach((f) => {
            const arr = failedByName.get(f.filename) ?? [];
            arr.push(f.errorCode === 'EVENT_STORAGE_LIMIT_EXCEEDED' ? t('storageLimitExceeded') : t('uploadFailed', { filename: f.filename }));
            failedByName.set(f.filename, arr);
        });

        const newMediaIdByKey = new Map<string, string>();
        const newErrorByKey = new Map<string, string>();
        let hasFailure = false;
        for (const img of toUpload) {
            const failMsgs = failedByName.get(img.file.name);
            if (failMsgs && failMsgs.length > 0) {
                newErrorByKey.set(img.key, failMsgs.shift()!);
                hasFailure = true;
                continue;
            }
            const createdList = createdByName.get(img.file.name);
            const created = createdList?.shift();
            if (created) newMediaIdByKey.set(img.key, created.id);
        }

        setImages((prev) =>
            prev.map((img) => {
                if (newMediaIdByKey.has(img.key)) {
                    return {
                        ...img,
                        status: 'uploaded' as const,
                        mediaId: newMediaIdByKey.get(img.key),
                    };
                }
                if (newErrorByKey.has(img.key)) {
                    return { ...img, status: 'failed' as const, error: newErrorByKey.get(img.key) };
                }
                return img;
            })
        );

        if (hasFailure) return null;

        return imagesRef.current
            .map((img) => newMediaIdByKey.get(img.key) ?? (img.status === 'uploaded' ? img.mediaId : undefined))
            .filter((id): id is string => Boolean(id));
    }

    async function submitPost(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit || !activeEvent || !activeMember) return;

        setSubmitError(null);

        const mediaIds = await uploadPendingImages();
        if (mediaIds === null) return;

        try {
            await createPost.mutateAsync({
                eventId: activeEvent.id,
                authorMemberId: activeMember.id,
                type: mediaIds.length > 0 ? 'MEDIA' : 'TEXT',
                content: caption.trim() || undefined,
                isPinned: false,
                mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
            });
        } catch (error) {
            setSubmitError(getComposerErrorMessage(error));
            return;
        }

        closeComposer();
    }

    async function submitPlaylistSuggestion(input: { title: string; artist?: string; youtubeUrl?: string; spotifyUrl?: string; comment?: string }) {
        if (!canComposeSong || !activeEvent || !activeMember) return;

        await createPlaylistSuggestion.mutateAsync({
            eventId: activeEvent.id,
            title: input.title,
            artist: input.artist,
            youtubeUrl: input.youtubeUrl,
            spotifyUrl: input.spotifyUrl,
            comment: input.comment,
        });

        closeComposer();
    }

    const openStoryCapture = useCallback(() => {
        if (!canComposeStory) return;
        storyInputRef.current?.click();
    }, [canComposeStory]);

    async function handleStoryFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !activeMember || !activeEvent || !canComposeStory) return;

        setStoryError(null);
        try {
            const media = await uploadMedia.mutateAsync({
                eventId: activeEvent.id,
                file,
                mediaType: 'IMAGE',
                uploaderMemberId: activeMember.id,
            });
            const story = await createStory.mutateAsync({
                eventId: activeEvent.id,
                authorMemberId: activeMember.id,
                mediaId: media.id,
            });
            router.push(routes.story(story.id));
        } catch (error) {
            setStoryError(getComposerErrorMessage(error));
        }
    }

    const initials = activeMember ? initialsFromName(activeMember.displayName) : '?';

    const contextValue: ComposerContextValue = useMemo(
        () => ({
            openPostComposer,
            openSongComposer,
            openStoryCapture,
            isCreatingStory: uploadMedia.isPending || createStory.isPending,
            storyError,
            canCompose,
            canComposePost,
            canComposeStory,
            canComposeSong,
        }),
        [canCompose, canComposePost, canComposeSong, canComposeStory, createStory.isPending, openPostComposer, openSongComposer, openStoryCapture, storyError, uploadMedia.isPending]
    );

    return {
        contextValue,
        isOpen,
        composerMode,
        caption,
        images,
        sizeError,
        countError,
        submitError,
        storyError,
        songComposerKey,
        fileRef,
        storyInputRef,
        textareaRef,
        memberName: activeMember?.displayName ?? '',
        hasUnresolvedFailures,
        isPostBusy,
        isSongBusy,
        canSubmit,
        canComposePost,
        canComposeStory,
        canComposeSong,
        maxImages,
        initials,
        openPostComposer,
        openSongComposer,
        openStoryCapture,
        selectPostMode,
        selectSongMode,
        closeComposer,
        handleCaptionChange,
        handlePickPhotos,
        handlePostFilesChange,
        handleRemoveImageClick,
        handleRetryUploadClick,
        submitPost,
        submitPlaylistSuggestion,
        handleStoryFileChange,
    };
}
