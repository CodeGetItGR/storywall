'use client';

import { ImagePlus, Music3, Send, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { AddSongForm } from '@/components/playlist';
import Avatar from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { useCreatePost, useCreateStory, useUploadMedia, useUploadMediaBatch } from '@/hooks';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventModules } from '@/hooks/useEventModules';
import { useCreatePlaylistSuggestion } from '@/hooks/usePlaylist';
import { routes } from '@/lib/routes';
import { initialsFromName } from '@/lib/utils';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

interface PendingImage {
    key: string;
    file: File;
    previewUrl: string;
    status: 'pending' | 'uploading' | 'uploaded' | 'failed';
    mediaId?: string;
    error?: string;
}

interface ComposerContextValue {
    openPostComposer: () => void;
    openSongComposer: () => void;
    openStoryCapture: () => void;
    isCreatingStory: boolean;
    storyError: string | null;
    canCompose: boolean;
    canComposeSong: boolean;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

function formatBytes(bytes: number): string {
    const megabytes = bytes / (1024 * 1024);
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}

export function ComposerProvider({ children }: { children: ReactNode }) {
    const t = useTranslations('ComposerCard');
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
    const [composerMode, setComposerMode] = useState<'post' | 'song'>('post');
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

    // Focus the caption box once the modal has mounted, but only for post mode.
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
    const canCompose = Boolean(activeMember) && Boolean(activeEvent);
    const canComposeSong = canCompose && eventModules.some((module) => module.moduleKey === 'playlist' && module.isEnabled);
    const maxMediaPerPost = appConfig?.media.maxMediaPerPost ?? 10;
    const maxBatchUploadFiles = appConfig?.media.maxBatchUploadFiles ?? 10;
    const maxImages = Math.min(maxMediaPerPost, maxBatchUploadFiles);
    const maxFileSizeBytes = appConfig?.media.maxFileSizeBytes ?? 20 * 1024 * 1024;
    const maxRequestSizeBytes = appConfig?.media.maxRequestSizeBytes ?? 220 * 1024 * 1024;
    const canSubmit = (caption.trim().length > 0 || images.length > 0) && !hasUnresolvedFailures && !isPostBusy && canCompose;

    function openPostComposer() {
        if (!canCompose) return;
        setComposerMode('post');
        setIsOpen(true);
    }

    function openSongComposer() {
        if (!canComposeSong) return;
        setComposerMode('song');
        setIsOpen(true);
    }

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
        setImages((prev) => {
            const target = prev.find((img) => img.key === key);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((img) => img.key !== key);
        });
    }

    function handleCaptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setCaption(e.target.value);
    }

    function handlePickPhotos() {
        fileRef.current?.click();
    }

    function handlePostFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
        handleFiles(e.target.files);
        e.target.value = '';
    }

    function handleRemoveImageClick(e: React.MouseEvent<HTMLButtonElement>) {
        const key = e.currentTarget.dataset.key;
        if (key) removeImage(key);
    }

    function handleRetryUploadClick() {
        void uploadPendingImages();
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
        } catch {
            setImages((prev) => prev.map((img) => (toUpload.some((u) => u.key === img.key) ? { ...img, status: 'failed' as const } : img)));
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
            arr.push(f.message);
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

    async function submitPost(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
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
        } catch {
            setSubmitError('Something went wrong. Please try again.');
            return;
        }

        closeComposer();
    }

    async function submitPlaylistSuggestion(input: {
        title: string;
        artist?: string;
        youtubeUrl?: string;
        spotifyUrl?: string;
        comment?: string;
    }) {
        if (!canComposeSong || !activeEvent || !activeMember) return;

        await createPlaylistSuggestion.mutateAsync({
            eventId: activeEvent.id,
            authorMemberId: activeMember.id,
            title: input.title,
            artist: input.artist,
            youtubeUrl: input.youtubeUrl,
            spotifyUrl: input.spotifyUrl,
            comment: input.comment,
        });

        closeComposer();
    }

    function openStoryCapture() {
        if (!canCompose) return;
        storyInputRef.current?.click();
    }

    async function handleStoryFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !activeMember || !activeEvent) return;

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
        } catch {
            setStoryError(t('storyUploadFailed'));
        }
    }

    const initials = activeMember ? initialsFromName(activeMember.displayName) : '?';

    const value: ComposerContextValue = {
        openPostComposer,
        openSongComposer,
        openStoryCapture,
        isCreatingStory: uploadMedia.isPending || createStory.isPending,
        storyError,
        canCompose,
        canComposeSong,
    };

    return (
        <ComposerContext.Provider value={value}>
            {children}

            <input
                ref={storyInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleStoryFileChange}
                aria-hidden="true"
                tabIndex={-1}
            />

            <Modal open={isOpen} onClose={closeComposer} size="sm" variant="sheet" closeLabel={t('cancel')} className="pb-[env(safe-area-inset-bottom)]">
                <Modal.Body className="p-4 pt-12">
                    <div className="mb-4 flex items-center gap-2 pr-10">
                        <button
                            type="button"
                            onClick={selectPostMode}
                            aria-pressed={composerMode === 'post'}
                            className={
                                `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ` +
                                (composerMode === 'post' ? 'bg-ink text-white' : 'bg-surface-muted text-ink-muted hover:bg-surface-muted/80')
                            }
                        >
                            {t('post')}
                        </button>
                        <button
                            type="button"
                            onClick={selectSongMode}
                            aria-pressed={composerMode === 'song'}
                            disabled={!canComposeSong}
                            className={
                                `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ` +
                                (composerMode === 'song'
                                    ? 'bg-primary-light text-primary-dark'
                                    : 'bg-surface-muted text-ink-muted hover:bg-surface-muted/80')
                            }
                        >
                            <Music3 className="h-3.5 w-3.5" />
                            {t('music')}
                        </button>
                    </div>

                    <div hidden={composerMode !== 'post'}>
                        <form onSubmit={submitPost} className="flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                                <Avatar initials={initials} size="md" alt={activeMember?.displayName} />
                                <textarea
                                    ref={textareaRef}
                                    value={caption}
                                    onChange={handleCaptionChange}
                                    placeholder={t('captionPlaceholder')}
                                    aria-label={t('captionAriaLabel')}
                                    rows={3}
                                    className="flex-1 resize-none rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:ring-2 focus:ring-primary/30"
                                />
                            </div>

                            {images.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {images.map((img) => (
                                        <div key={img.key} className="relative aspect-square overflow-hidden rounded-xl bg-surface-muted">
                                            <Image src={img.previewUrl} alt="" fill className="object-cover" sizes="200px" />
                                            <button
                                                type="button"
                                                onClick={handleRemoveImageClick}
                                                data-key={img.key}
                                                disabled={img.status === 'uploading'}
                                                aria-label={t('removeImage')}
                                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-white transition-colors hover:bg-ink/80 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                            {img.status === 'uploading' && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-ink/40 text-xs text-white">β€¦</div>
                                            )}
                                            {img.status === 'failed' && (
                                                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-destructive/90 px-1.5 py-1 text-[10px] text-white">
                                                    <span className="truncate">{t('uploadFailed', { filename: img.file.name })}</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleRetryUploadClick}
                                                        disabled={uploadBatch.isPending}
                                                        className="shrink-0 underline disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        {t('retry')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {(sizeError || countError || submitError) && (
                                <p className="text-xs text-destructive">{sizeError ?? countError ?? submitError}</p>
                            )}

                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={handlePickPhotos}
                                    disabled={images.length >= maxImages}
                                    className="flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ImagePlus className="h-4 w-4" />
                                    {t('addPhotos')}
                                </button>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="sr-only"
                                    onChange={handlePostFilesChange}
                                    aria-label={t('addPhotos')}
                                    tabIndex={-1}
                                />

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={closeComposer}
                                        disabled={isPostBusy}
                                        className="rounded-full px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!canSubmit}
                                        className="flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <Send className="h-4 w-4" />
                                        {isPostBusy ? t('posting') : t('post')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div hidden={composerMode !== 'song'}>
                        <AddSongForm
                            key={songComposerKey}
                            isSubmitting={isSongBusy}
                            canSubmit={canComposeSong}
                            onSubmit={submitPlaylistSuggestion}
                            compact
                        />
                    </div>
                </Modal.Body>
            </Modal>
        </ComposerContext.Provider>
    );
}

export function useComposer(): ComposerContextValue {
    const context = useContext(ComposerContext);
    if (!context) {
        throw new Error('useComposer must be used within a ComposerProvider');
    }
    return context;
}
