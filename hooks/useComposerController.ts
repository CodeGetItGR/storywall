'use client';

import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useCreatePlaylistSuggestion } from '@/hooks/usePlaylist';
import { type StoryComposerController, useStoryComposerController } from '@/hooks/useStoryComposerController';
import type { EventModuleResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { initialsFromName } from '@/lib/utils';
import type { ComposerContextValue } from '@/providers/composer/ComposerContext';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';
import { usePublishQueue } from '@/providers/publishQueue/PublishQueueContext';

type ComposerMode = 'post' | 'song';

export interface PendingImage {
    key: string;
    file: File;
    previewUrl: string;
    status: 'pending' | 'uploading' | 'uploaded' | 'failed';
    filterId: string;
    mediaId?: string;
    error?: string;
}

export interface ComposerController {
    contextValue: ComposerContextValue;
    isOpen: boolean;
    composerMode: ComposerMode;
    caption: string;
    images: PendingImage[];
    selectedImageForFilter: PendingImage | null;
    activeMediaPreview: PendingImage | null;
    sizeError: string | null;
    countError: string | null;
    storyComposer: StoryComposerController;
    songComposerKey: number;
    fileRef: React.RefObject<HTMLInputElement | null>;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    memberName: string;
    isSongBusy: boolean;
    canSubmit: boolean;
    canComposePost: boolean;
    canComposeStory: boolean;
    canComposeSong: boolean;
    maxImages: number;
    maxCaptionLength: number;
    initials: string;
    openPostComposer: () => void;
    openPostImagePicker: () => void;
    openSongComposer: () => void;
    openStoryCapture: () => void;
    selectPostMode: () => void;
    selectSongMode: () => void;
    closeComposer: () => void;
    closeMediaPreview: () => void;
    advanceMediaPreview: () => void;
    retreatMediaPreview: () => void;
    handleCaptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handlePickPhotos: () => void;
    handlePostFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveImageClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    handleImageFilterSelection: (event: React.MouseEvent<HTMLButtonElement>) => void;
    setImageFilter: (filterId: string) => void;
    submitPost: (event: React.SubmitEvent<HTMLFormElement>) => void;
    submitPlaylistSuggestion: (input: {
        title: string;
        artist?: string;
        youtubeUrl?: string;
        spotifyUrl?: string;
        comment?: string;
    }) => Promise<void>;
}

function formatBytes(bytes: number): string {
    const megabytes = bytes / (1024 * 1024);
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}

const EMPTY_MODULES: EventModuleResponseDto[] = [];

export function useComposerController(): ComposerController {
    const t = useTranslations('ComposerCard');
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    // The event detail already carries its modules; no separate /modules read.
    const eventModules = activeEvent?.modules ?? EMPTY_MODULES;
    const { data: appConfig } = useAppConfig();
    const publishQueue = usePublishQueue();
    const createPlaylistSuggestion = useCreatePlaylistSuggestion();

    const [isOpen, setIsOpen] = useState(false);
    const [composerMode, setComposerMode] = useState<ComposerMode>('post');
    const [caption, setCaption] = useState('');
    const [images, setImages] = useState<PendingImage[]>([]);
    const [selectedImageKey, setSelectedImageKey] = useState<string | null>(null);
    const [mediaPreviewKey, setMediaPreviewKey] = useState<string | null>(null);
    const [sizeError, setSizeError] = useState<string | null>(null);
    const [countError, setCountError] = useState<string | null>(null);
    const [songComposerKey, setSongComposerKey] = useState(0);
    const fileRef = useRef<HTMLInputElement>(null);
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

    const selectedImageForFilter = images.find((image) => image.key === selectedImageKey && !image.file.type.startsWith('video/')) ?? null;
    const activeMediaPreview = images.find((image) => image.key === mediaPreviewKey) ?? null;
    const isSongBusy = createPlaylistSuggestion.isPending;
    const canCompose = Boolean(activeMember) && isEventWritable(activeEvent?.status);
    const canComposePost = canCompose && eventModules.some((module) => module.moduleKey === 'posts' && module.isAvailable);
    const canComposeStory = canCompose && eventModules.some((module) => module.moduleKey === 'stories' && module.isAvailable);
    const storyComposer = useStoryComposerController(canComposeStory);
    const canComposeSong = canCompose && eventModules.some((module) => module.moduleKey === 'playlist' && module.isAvailable);
    const maxMediaPerPost = appConfig?.media.maxMediaPerPost ?? 10;
    const maxBatchUploadFiles = appConfig?.media.maxBatchUploadFiles ?? 10;
    const maxImages = Math.min(maxMediaPerPost, maxBatchUploadFiles);
    const maxCaptionLength = appConfig?.contentLimits.postContentMaxLength ?? 500;
    const maxImageBytes = appConfig?.media.maxImageBytes ?? 25 * 1024 * 1024;
    const maxVideoBytes = appConfig?.media.maxVideoBytes ?? 200 * 1024 * 1024;
    const maxRequestSizeBytes = appConfig?.media.maxRequestSizeBytes ?? 260 * 1024 * 1024;
    const canSubmit = (caption.trim().length > 0 || images.length > 0) && caption.length <= maxCaptionLength && canComposePost;

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
        if (isSongBusy) return;
        images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        setCaption('');
        setImages([]);
        setSelectedImageKey(null);
        setMediaPreviewKey(null);
        setSizeError(null);
        setCountError(null);
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
            const byteLimit = file.type.startsWith('video/') ? maxVideoBytes : maxImageBytes;
            if (file.size > byteLimit) {
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
            setSizeError(t('fileTooLarge', { filename: oversizeNames.join(', ') }));
        } else if (requestTooLarge) {
            setSizeError(t('requestTooLarge', { size: formatBytes(maxRequestSizeBytes) }));
        }

        if (accepted.length > 0) {
            const pending = accepted.map((file) => ({
                key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
                file,
                previewUrl: URL.createObjectURL(file),
                filterId: 'original',
                status: 'pending' as const,
            }));
            setImages((prev) => [...prev, ...pending]);
            setSelectedImageKey(pending[0].file.type.startsWith('video/') ? null : pending[0].key);
            setMediaPreviewKey(pending[0].key);
        }
    }

    function removeImage(key: string) {
        if (!canComposePost) return;
        if (selectedImageKey === key)
            setSelectedImageKey(images.find((image) => image.key !== key && !image.file.type.startsWith('video/'))?.key ?? null);
        setImages((prev) => {
            const target = prev.find((img) => img.key === key);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((img) => img.key !== key);
        });
        if (mediaPreviewKey === key) {
            setMediaPreviewKey(null);
        }
    }

    function handleCaptionChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        setCaption(event.target.value.slice(0, maxCaptionLength));
    }

    const handlePickPhotos = useCallback(() => {
        if (!canComposePost) return;
        fileRef.current?.click();
    }, [canComposePost]);

    const openPostImagePicker = useCallback(() => {
        if (!canComposePost) return;
        setComposerMode('post');
        setIsOpen(true);
        requestAnimationFrame(() => handlePickPhotos());
    }, [canComposePost, handlePickPhotos]);

    function handlePostFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
        handleFiles(event.target.files);
        event.target.value = '';
    }

    function handleRemoveImageClick(event: React.MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.dataset.key;
        if (key) removeImage(key);
    }

    function handleImageFilterSelection(event: React.MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.dataset.key;
        if (!key) return;
        const image = images.find((candidate) => candidate.key === key);
        if (!image) return;
        if (!image.file.type.startsWith('video/')) setSelectedImageKey(key);
        setMediaPreviewKey(key);
    }

    function closeMediaPreview() {
        setMediaPreviewKey(null);
    }

    function advanceMediaPreview() {
        const currentIndex = images.findIndex((image) => image.key === mediaPreviewKey);
        const nextImage = currentIndex === -1 ? undefined : images[currentIndex + 1];
        if (!nextImage) {
            closeMediaPreview();
            return;
        }

        setMediaPreviewKey(nextImage.key);
        setSelectedImageKey(nextImage.file.type.startsWith('video/') ? null : nextImage.key);
    }

    function retreatMediaPreview() {
        const currentIndex = images.findIndex((image) => image.key === mediaPreviewKey);
        const previousImage = currentIndex > 0 ? images[currentIndex - 1] : undefined;
        if (!previousImage) return;

        setMediaPreviewKey(previousImage.key);
        setSelectedImageKey(previousImage.file.type.startsWith('video/') ? null : previousImage.key);
    }

    function setImageFilter(filterId: string) {
        if (!selectedImageForFilter) return;
        setImages((current) => current.map((image) => (image.key === selectedImageForFilter.key ? { ...image, filterId } : image)));
    }

    function submitPost(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit || !activeEvent || !activeMember) return;

        publishQueue.enqueuePost({
            eventId: activeEvent.id,
            authorMemberId: activeMember.id,
            caption,
            images,
        });

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

    const initials = activeMember ? initialsFromName(activeMember.displayName) : '?';

    const contextValue: ComposerContextValue = useMemo(
        () => ({
            openPostComposer,
            openPostImagePicker,
            openSongComposer,
            openStoryCapture: storyComposer.open,
            canCompose,
            canComposePost,
            canComposeStory,
            canComposeSong,
        }),
        [canCompose, canComposePost, canComposeSong, canComposeStory, openPostComposer, openPostImagePicker, openSongComposer, storyComposer.open],
    );

    return {
        contextValue,
        isOpen,
        composerMode,
        caption,
        images,
        selectedImageForFilter,
        activeMediaPreview,
        sizeError,
        countError,
        storyComposer,
        songComposerKey,
        fileRef,
        textareaRef,
        memberName: activeMember?.displayName ?? '',
        isSongBusy,
        canSubmit,
        canComposePost,
        canComposeStory,
        canComposeSong,
        maxImages,
        maxCaptionLength,
        initials,
        openPostComposer,
        openPostImagePicker,
        openSongComposer,
        openStoryCapture: storyComposer.open,
        selectPostMode,
        selectSongMode,
        closeComposer,
        closeMediaPreview,
        advanceMediaPreview,
        retreatMediaPreview,
        handleCaptionChange,
        handlePickPhotos,
        handlePostFilesChange,
        handleRemoveImageClick,
        handleImageFilterSelection,
        setImageFilter,
        submitPost,
        submitPlaylistSuggestion,
    };
}
