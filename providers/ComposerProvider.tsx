'use client';

import { ImagePlus, Send, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import Avatar from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { useCreatePost, useCreateStory, useUploadMedia, useUploadMediaBatch } from '@/hooks';
import { initialsFromName } from '@/lib/utils';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

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
    openStoryCapture: () => void;
    isCreatingStory: boolean;
    storyError: string | null;
    canCompose: boolean;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

export function ComposerProvider({ children }: { children: ReactNode }) {
    const t = useTranslations('ComposerCard');
    const router = useRouter();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const createPost = useCreatePost();
    const uploadBatch = useUploadMediaBatch();
    const uploadMedia = useUploadMedia();
    const createStory = useCreateStory();

    const [isOpen, setIsOpen] = useState(false);
    const [caption, setCaption] = useState('');
    const [images, setImages] = useState<PendingImage[]>([]);
    const [sizeError, setSizeError] = useState<string | null>(null);
    const [countError, setCountError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [storyError, setStoryError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const storyInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus the caption box once the modal (and its portaled DOM) has
    // actually mounted, rather than in the same tick as setIsOpen(true) —
    // the textarea doesn't exist yet at that point since Dialog.Portal only
    // renders its content once `open` takes effect.
    useEffect(() => {
        if (!isOpen) return;
        const raf = requestAnimationFrame(() => textareaRef.current?.focus());
        return () => cancelAnimationFrame(raf);
    }, [isOpen]);

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
    const canCompose = Boolean(activeMember) && Boolean(activeEvent);
    const canSubmit = (caption.trim().length > 0 || images.length > 0) && !hasUnresolvedFailures && !isPostBusy && canCompose;

    function openPostComposer() {
        if (!canCompose) return;
        setIsOpen(true);
    }

    function closePostComposer() {
        if (isPostBusy) return;
        images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        setCaption('');
        setImages([]);
        setSizeError(null);
        setCountError(null);
        setSubmitError(null);
        setIsOpen(false);
    }

    function handleFiles(fileList: FileList | null) {
        if (!fileList || fileList.length === 0) return;
        setSizeError(null);
        setCountError(null);

        const incoming = Array.from(fileList);
        const room = MAX_IMAGES - images.length;
        const accepted: File[] = [];
        const oversizeNames: string[] = [];

        for (const file of incoming) {
            if (accepted.length >= room) break;
            if (file.size > MAX_FILE_SIZE_BYTES) {
                oversizeNames.push(file.name);
                continue;
            }
            accepted.push(file);
        }

        if (incoming.length > room) setCountError(t('maxImagesReached'));
        if (oversizeNames.length > 0) setSizeError(t('fileTooLarge', { filename: oversizeNames.join(', ') }));

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

        // Correlate each pending image with its result in a single synchronous
        // pass (not inside the setImages updater, whose timing isn't
        // guaranteed) so both the new image states and the ordered id list
        // below are derived from the same, reliable data.
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

        // Order the returned ids by the latest image state (via imagesRef, not
        // the closed-over `images` snapshot) so a removal that happened while
        // this round was in flight is reflected, rather than by the raw API
        // response order. Skip any image that was removed entirely (it won't
        // be in imagesRef.current).
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

        closePostComposer();
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
            router.push(`/story/${story.id}`);
        } catch {
            setStoryError(t('storyUploadFailed'));
        }
    }

    const initials = activeMember ? initialsFromName(activeMember.displayName) : '?';

    const value: ComposerContextValue = {
        openPostComposer,
        openStoryCapture,
        isCreatingStory: uploadMedia.isPending || createStory.isPending,
        storyError,
        canCompose,
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

            <Modal open={isOpen} onClose={closePostComposer} size="sm" closeLabel={t('cancel')}>
                <Modal.Body className="p-4">
                    <form onSubmit={submitPost} className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <Avatar initials={initials} size="md" alt={activeMember?.displayName} />
                            <textarea
                                ref={textareaRef}
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder={t('captionPlaceholder')}
                                aria-label={t('captionAriaLabel')}
                                rows={3}
                                className="flex-1 bg-surface-muted rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 resize-none transition leading-relaxed"
                            />
                        </div>

                        {images.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {images.map((img) => (
                                    <div key={img.key} className="relative aspect-square rounded-xl overflow-hidden bg-surface-muted">
                                        <Image src={img.previewUrl} alt="" fill className="object-cover" sizes="200px" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(img.key)}
                                            disabled={img.status === 'uploading'}
                                            aria-label={t('removeImage')}
                                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/60 flex items-center justify-center text-white hover:bg-ink/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                        {img.status === 'uploading' && (
                                            <div className="absolute inset-0 bg-ink/40 flex items-center justify-center text-white text-xs">…</div>
                                        )}
                                        {img.status === 'failed' && (
                                            <div className="absolute inset-x-0 bottom-0 bg-destructive/90 text-white text-[10px] px-1.5 py-1 flex items-center justify-between gap-1">
                                                <span className="truncate">{t('uploadFailed', { filename: img.file.name })}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => uploadPendingImages()}
                                                    disabled={uploadBatch.isPending}
                                                    className="underline shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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
                                onClick={() => fileRef.current?.click()}
                                disabled={images.length >= MAX_IMAGES}
                                className="flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ImagePlus className="w-4 h-4" />
                                {t('addPhotos')}
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="sr-only"
                                onChange={(e) => {
                                    handleFiles(e.target.files);
                                    e.target.value = '';
                                }}
                                aria-label={t('addPhotos')}
                                tabIndex={-1}
                            />

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={closePostComposer}
                                    disabled={isPostBusy}
                                    className="px-4 py-2 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                >
                                    <Send className="w-4 h-4" />
                                    {isPostBusy ? t('posting') : t('post')}
                                </button>
                            </div>
                        </div>
                    </form>
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
