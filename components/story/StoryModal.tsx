'use client';

import { Dialog } from '@base-ui/react/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { StoryCaptionBar, StoryHeader, StoryProgressBar } from '@/components/story';
import { StoryVideo } from '@/components/story/StoryVideo';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useStoryModal } from '@/hooks/useStoryModal';

type StoryModalProps = {
    open: boolean;
    storyId: string | null;
    onCloseAction: () => void;
};

export function StoryModal({ open, storyId, onCloseAction }: StoryModalProps) {
    const t = useTranslations('StoryPage');
    const locale = useLocale();
    const {
        onOpenChange,
        currentStoryId,
        storyNotFound,
        activeStory,
        group,
        storyIndex,
        media,
        author,
        progress,
        showMenu,
        showDeleteConfirm,
        canManage,
        canDeleteStory,
        isVideoStory,
        isDeleting,
        goNext,
        goPrev,
        handleCloseStory,
        handleToggleMenu,
        handleDeleteRequest,
        handleCloseDeleteConfirm,
        handleDelete,
        handleMediaLoaded,
        handleVideoTimeUpdate,
        handleVideoEnded,
    } = useStoryModal({ open, storyId, onCloseAction });

    if (!currentStoryId || storyNotFound) return null;
    if (!activeStory || !group || storyIndex < 0) {
        return (
            <Dialog.Root open={open} onOpenChange={onOpenChange}>
                <Dialog.Portal>
                    {/* Backdrop */}
                    <Dialog.Backdrop className="motion-story-overlay fixed inset-0 z-60 bg-black opacity-100 data-closed:pointer-events-none" />
                    {/* Story loading */}
                    <Dialog.Popup aria-label={t('story')} className="motion-story-frame fixed inset-0 z-60 bg-black outline-none" />
                </Dialog.Portal>
            </Dialog.Root>
        );
    }

    const timeStr = new Date(activeStory.createdAt).toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit',
    });
    const authorName = author?.displayName ?? t('unknownAuthor');
    const hasMedia = Boolean(media);
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                {/* Backdrop */}
                <Dialog.Backdrop className="motion-story-overlay fixed inset-0 z-60 bg-black opacity-100 data-closed:pointer-events-none" />
                {/* Story */}
                <Dialog.Popup aria-label={t('story')} className="motion-story-frame fixed inset-0 z-60 bg-black outline-none">
                    <div className="relative h-dvh w-full overflow-hidden bg-black">
                        {/* Progress */}
                        <StoryProgressBar stories={group.stories} activeIndex={storyIndex} progress={progress} />

                        {/* Header */}
                        <StoryHeader
                            authorName={authorName}
                            authorId={activeStory.authorMemberId ?? activeStory.id}
                            timeStr={timeStr}
                            canManage={canManage}
                            canDelete={canDeleteStory}
                            showMenu={showMenu}
                            onToggleMenu={handleToggleMenu}
                            onClose={handleCloseStory}
                            onDeleteRequest={handleDeleteRequest}
                        />

                        {/* Media */}
                        {media &&
                            (isVideoStory ? (
                                <StoryVideo
                                    key={media.id}
                                    src={media.mediaUrl}
                                    onLoadedData={handleMediaLoaded}
                                    onTimeUpdate={handleVideoTimeUpdate}
                                    onEnded={handleVideoEnded}
                                />
                            ) : (
                                <ProtectedImage
                                    src={media.mediaUrl}
                                    alt={t('userStory', { name: authorName })}
                                    fill
                                    className="object-contain"
                                    sizes="100vw"
                                    priority
                                    onLoadingComplete={handleMediaLoaded}
                                />
                            ))}

                        {/* Tap zones */}
                        <button onClick={goPrev} className="absolute left-0 top-0 z-10 h-full w-1/3" aria-label={t('previousStory')} />
                        <button onClick={goNext} className="absolute right-0 top-0 z-10 h-full w-1/3" aria-label={t('nextStory')} />

                        {/* Desktop arrows */}
                        <div className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 sm:flex">
                            <button
                                onClick={goPrev}
                                aria-label={t('previous')}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 sm:flex">
                            <button
                                onClick={goNext}
                                aria-label={t('next')}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Caption */}
                        {hasMedia && <StoryCaptionBar story={activeStory} />}
                        {!hasMedia && <section className="absolute inset-0 flex w-full min-w-0 min-h-0 flex-1 flex-col" />}
                    </div>
                </Dialog.Popup>

                {/* Confirm */}
                <ConfirmActionModal
                    open={showDeleteConfirm}
                    onCloseAction={handleCloseDeleteConfirm}
                    onConfirmAction={handleDelete}
                    title={t('deleteStoryConfirmTitle')}
                    body={t('deleteStoryConfirmBody')}
                    confirmLabel={t('deleteStoryConfirm')}
                    cancelLabel={t('cancel')}
                    isConfirming={isDeleting}
                />
            </Dialog.Portal>
        </Dialog.Root>
    );
}
