'use client';

import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAnnouncementPost } from '@/hooks/useAnnouncementPost';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useCanAnnounce } from '@/hooks/useCanAnnounce';
import { type StoryComposerController, useStoryComposerController } from '@/hooks/useStoryComposerController';
import type { EventModuleResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { getUploadLimits } from '@/lib/uploadLimits';
import { initialsFromName } from '@/lib/utils';
import type { ComposerContextValue } from '@/providers/composer/ComposerContext';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';
import { usePublishQueue } from '@/providers/publishQueue/PublishQueueContext';

export type ComposerMode = 'post' | 'song' | 'announcement';

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
    canSubmit: boolean;
    canComposePost: boolean;
    canComposeStory: boolean;
    canComposeSong: boolean;
    canAnnounce: boolean;
    isAnnouncing: boolean;
    announcementError: string | null;
    maxImages: number;
    maxCaptionLength: number;
    initials: string;
    openPostComposer: () => void;
    openPostImagePicker: () => void;
    openSongComposer: () => void;
    openAnnouncementComposer: () => void;
    openStoryCapture: () => void;
    selectPostMode: () => void;
    selectSongMode: () => void;
    selectAnnouncementMode: () => void;
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
    submitAnnouncement: (event: React.SubmitEvent<HTMLFormElement>) => void;
    submitPlaylistSuggestion: (input: { title: string; artist?: string; youtubeUrl?: string; spotifyUrl?: string; comment?: string }) => void;
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
        if (!isOpen || composerMode === 'song') return;
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
    const canCompose = Boolean(activeMember) && isEventWritable(activeEvent?.status);
    const canComposePost = canCompose && eventModules.some((module) => module.moduleKey === 'posts' && module.isAvailable);
    const canComposeStory = canCompose && eventModules.some((module) => module.moduleKey === 'stories' && module.isAvailable);
    const storyComposer = useStoryComposerController(canComposeStory);
    const canComposeSong = canCompose && eventModules.some((module) => module.moduleKey === 'playlist' && module.isAvailable);
    const canAnnounce = useCanAnnounce(canComposePost);
    const announcement = useAnnouncementPost();
    const maxMediaPerPost = appConfig?.media.maxMediaPerPost ?? 10;
    const maxBatchUploadFiles = appConfig?.media.maxBatchUploadFiles ?? 10;
    const maxImages = Math.min(maxMediaPerPost, maxBatchUploadFiles);
    const maxCaptionLength = appConfig?.contentLimits.postContentMaxLength ?? 500;
    // The files are sent in as many requests as the request size cap needs, so
    // only each file's own cap limits what can be added.
    const { imageBytes: maxImageBytes, videoBytes: maxVideoBytes } = getUploadLimits(appConfig?.media);
    const withinLimit = caption.length <= maxCaptionLength;
    // An announcement is text only and waits for its own request; a post needs text or media.
    const canSubmit =
        composerMode === 'announcement'
            ? caption.trim().length > 0 && withinLimit && canAnnounce && !announcement.isPosting
            : (caption.trim().length > 0 || images.length > 0) && withinLimit && canComposePost;

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

    const openAnnouncementComposer = useCallback(() => {
        if (!canAnnounce) return;
        setComposerMode('announcement');
        setIsOpen(true);
    }, [canAnnounce]);

    function selectPostMode() {
        setComposerMode('post');
    }

    function selectSongMode() {
        if (!canComposeSong) return;
        setComposerMode('song');
    }

    function selectAnnouncementMode() {
        if (!canAnnounce) return;
        setComposerMode('announcement');
    }

    function closeComposer() {
        images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        setCaption('');
        setImages([]);
        setSelectedImageKey(null);
        setMediaPreviewKey(null);
        setSizeError(null);
        setCountError(null);
        setComposerMode('post');
        setSongComposerKey((current) => current + 1);
        announcement.reset();
        setIsOpen(false);
    }

    const imageCount = images.length;
    const handleFiles = useCallback(
        (fileList: FileList | null, preview: boolean) => {
            if (!canComposePost) return;
            if (!fileList || fileList.length === 0) return;
            setSizeError(null);
            setCountError(null);

            const incoming = Array.from(fileList);
            const room = maxImages - imageCount;
            const accepted: File[] = [];
            const oversizeNames: string[] = [];

            for (const file of incoming) {
                if (accepted.length >= room) break;
                const byteLimit = file.type.startsWith('video/') ? maxVideoBytes : maxImageBytes;
                if (file.size > byteLimit) {
                    oversizeNames.push(file.name);
                    continue;
                }
                accepted.push(file);
            }

            if (incoming.length > room) setCountError(t('maxImagesReached', { count: maxImages }));
            if (oversizeNames.length > 0) {
                setSizeError(
                    t('fileTooLarge', {
                        filename: oversizeNames.join(', '),
                        imageSize: formatBytes(maxImageBytes),
                        videoSize: formatBytes(maxVideoBytes),
                    }),
                );
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
                if (preview) setMediaPreviewKey(pending[0].key);
            }
        },
        [canComposePost, imageCount, maxImageBytes, maxImages, maxVideoBytes, t],
    );

    // No full-screen preview: two dialogs opening in one go would each hide the other from screen readers.
    const openPostWithFiles = useCallback(
        (fileList: FileList | null) => {
            if (!canComposePost || !fileList || fileList.length === 0) return;
            setComposerMode('post');
            setIsOpen(true);
            handleFiles(fileList, false);
        },
        [canComposePost, handleFiles],
    );

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
        handleFiles(event.target.files, true);
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
        if (composerMode !== 'post' || !canSubmit || !activeEvent || !activeMember) return;

        publishQueue.enqueuePost({
            eventId: activeEvent.id,
            authorMemberId: activeMember.id,
            caption,
            images,
        });

        closeComposer();
    }

    // Text only: photos added in Post mode stay in that draft and are not sent.
    async function submitAnnouncement(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit || !activeEvent) return;
        if (await announcement.post(activeEvent.id, caption)) closeComposer();
    }

    function submitPlaylistSuggestion(input: { title: string; artist?: string; youtubeUrl?: string; spotifyUrl?: string; comment?: string }) {
        if (!canComposeSong || !activeEvent || !activeMember) return;

        publishQueue.enqueueSong({ eventId: activeEvent.id, ...input });

        closeComposer();
    }

    const initials = activeMember ? initialsFromName(activeMember.displayName) : '?';

    const contextValue: ComposerContextValue = useMemo(
        () => ({
            openPostComposer,
            openPostImagePicker,
            openPostWithFiles,
            openSongComposer,
            openAnnouncementComposer,
            openStoryCapture: storyComposer.open,
            canCompose,
            canComposePost,
            canComposeStory,
            canComposeSong,
            canAnnounce,
        }),
        [
            canAnnounce,
            canCompose,
            canComposePost,
            canComposeSong,
            canComposeStory,
            openAnnouncementComposer,
            openPostComposer,
            openPostImagePicker,
            openPostWithFiles,
            openSongComposer,
            storyComposer.open,
        ],
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
        canSubmit,
        canComposePost,
        canComposeStory,
        canComposeSong,
        canAnnounce,
        isAnnouncing: announcement.isPosting,
        announcementError: announcement.error,
        maxImages,
        maxCaptionLength,
        initials,
        openPostComposer,
        openPostImagePicker,
        openSongComposer,
        openAnnouncementComposer,
        openStoryCapture: storyComposer.open,
        selectPostMode,
        selectSongMode,
        selectAnnouncementMode,
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
        submitAnnouncement,
        submitPlaylistSuggestion,
    };
}
