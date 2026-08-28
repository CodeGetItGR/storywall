'use client';

import { Dialog } from '@base-ui/react/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { StoryCaptionBar, StoryHeader, StoryProgressBar, StoryViewersModal } from '@/components/story';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDeleteStory, useEventMembers, useEventStories, useMarkStoryViewed, useMediaItem, useStory, useStoryViews } from '@/hooks';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import { ApiError } from '@/lib/api/client';
import { isEventWritable } from '@/lib/eventLifecycle';
import { groupStoriesByAuthor } from '@/lib/stories';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

type StoryModalProps = {
    open: boolean;
    storyId: string | null;
    onCloseAction: () => void;
};

export function StoryModal({ open, storyId, onCloseAction }: StoryModalProps) {
    const t = useTranslations('StoryPage');
    const locale = useLocale();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const isHost = useIsHost();

    const [activeStoryId, setActiveStoryId] = useState<string | null>(storyId);
    const [progress, setProgress] = useState(0);
    const [showViewers, setShowViewers] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { requestClose } = useOverlayHistory(open, onCloseAction);

    const currentStoryId = open ? (activeStoryId ?? storyId) : activeStoryId;

    const { data: story, error: storyError } = useStory(currentStoryId);
    const eventId = story?.eventId ?? null;
    const { data: media } = useMediaItem(story?.mediaId ?? null);
    const { data: allStories = [] } = useEventStories(eventId);
    const { data: members = [] } = useEventMembers(eventId);
    const markViewed = useMarkStoryViewed();
    const deleteStory = useDeleteStory(eventId ?? '');

    // Reset the viewer state whenever the popup opens on a different story.
    const [prevStoryState, setPrevStoryState] = useState({ open, storyId });
    if (open && (storyId !== prevStoryState.storyId || open !== prevStoryState.open)) {
        setPrevStoryState({ open, storyId });
        setActiveStoryId(storyId);
        setProgress(0);
        setShowMenu(false);
        setShowDeleteConfirm(false);
        setShowViewers(false);
    }

    const groups = useMemo(() => groupStoriesByAuthor(allStories, { filterExpired: false }), [allStories]);
    const groupIndex = groups.findIndex((g) => g.stories.some((s) => s.id === currentStoryId));
    const group = groupIndex >= 0 ? groups[groupIndex] : null;
    const storyIndex = group ? group.stories.findIndex((s) => s.id === currentStoryId) : -1;

    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
    const author = story?.authorMemberId ? membersById.get(story.authorMemberId) : undefined;
    const canWrite = isEventWritable(activeEvent?.status);
    const canManage = Boolean(story && activeMember && (activeMember.id === story.authorMemberId || isHost));
    const canDeleteStory = canManage && canWrite;
    const canAdvanceStory = Boolean(story && group && storyIndex >= 0);

    const { data: viewers = [], isFetching: viewersLoading } = useStoryViews(showViewers ? currentStoryId : null);

    function handleTimerComplete() {
        if (!group || storyIndex < 0) {
            onCloseAction();
            return;
        }

        goNext();
    }

    const onOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen) requestClose();
        },
        [requestClose]
    );

    useEffect(() => {
        if (!open || !currentStoryId) return;
        markViewed.mutate(currentStoryId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStoryId, open]);

    useEffect(() => {
        if (!open || !currentStoryId || !canAdvanceStory) return;

        const interval = setInterval(() => {
            setProgress((p) => {
                if (p >= 100) {
                    clearInterval(interval);
                    handleTimerComplete();
                    return 100;
                }
                return p + 2;
            });
        }, 100);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canAdvanceStory, currentStoryId, open]);

    useEffect(() => {
        if (!open) return;
        if (storyError instanceof ApiError && storyError.status === 404) {
            onCloseAction();
        }
    }, [onCloseAction, open, storyError]);

    useEffect(() => {
        if (!open || !currentStoryId || !story) return;
        if (!group || storyIndex < 0) {
            onCloseAction();
        }
    }, [currentStoryId, group, onCloseAction, open, story, storyIndex]);

    if (!currentStoryId) return null;
    if (storyError instanceof ApiError && storyError.status === 404) return null;
    if (!story || !group || storyIndex < 0) return null;

    function goNext() {
        if (!group || storyIndex < 0) {
            onCloseAction();
            return;
        }
        if (storyIndex < group.stories.length - 1) {
            setActiveStoryId(group.stories[storyIndex + 1].id);
            return;
        }
        const nextGroup = groups[groupIndex + 1];
        if (nextGroup) {
            setActiveStoryId(nextGroup.stories[0].id);
            return;
        }
        onCloseAction();
    }

    function goPrev() {
        if (!group) return;
        if (storyIndex > 0) {
            setActiveStoryId(group.stories[storyIndex - 1].id);
            return;
        }
        const prevGroup = groups[groupIndex - 1];
        if (prevGroup) {
            setActiveStoryId(prevGroup.stories[prevGroup.stories.length - 1].id);
        }
    }

    function handleCloseStory() {
        requestClose();
    }

    function handleToggleMenu() {
        setShowMenu((v) => !v);
    }

    function handleShowViewers() {
        setShowViewers(true);
    }

    function handleHideViewers() {
        setShowViewers(false);
    }

    function handleDeleteRequest() {
        if (!canDeleteStory) return;
        setShowMenu(false);
        setShowDeleteConfirm(true);
    }

    function handleCloseDeleteConfirm() {
        setShowDeleteConfirm(false);
    }

    async function handleDelete() {
        if (!canDeleteStory) return;
        handleCloseDeleteConfirm();
        if (!currentStoryId) return;
        await deleteStory.mutateAsync(currentStoryId);
        goNext();
    }

    const timeStr = new Date(story.createdAt).toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit',
    });
    const authorName = author?.displayName ?? t('unknownAuthor');
    const hasMedia = Boolean(media);
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                {/* Backdrop */}
                <Dialog.Backdrop className="motion-story-overlay fixed inset-0 z-[60] bg-black opacity-100 data-closed:pointer-events-none" />
                {/* Story */}
                <Dialog.Popup aria-label={t('story')} className="motion-story-frame fixed inset-0 z-[60] bg-black outline-none">
                    <div className="relative h-full w-full overflow-hidden bg-black">
                        {/* Progress */}
                        <StoryProgressBar stories={group.stories} activeIndex={storyIndex} progress={progress} />

                        {/* Header */}
                        <StoryHeader
                            authorName={authorName}
                            authorId={story.authorMemberId ?? story.id}
                            timeStr={timeStr}
                            canManage={canManage}
                            canDelete={canDeleteStory}
                            showMenu={showMenu}
                            onToggleMenu={handleToggleMenu}
                            onClose={handleCloseStory}
                            onDeleteRequest={handleDeleteRequest}
                        />

                        {/* Media */}
                        {media && (
                            <ProtectedImage
                                src={media.mediaUrl}
                                alt={t('userStory', { name: authorName })}
                                fill
                                className="object-cover"
                                sizes="100vw"
                                priority
                            />
                        )}

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
                        {hasMedia && <StoryCaptionBar story={story} canManage={canManage} onShowViewersAction={handleShowViewers} />}
                        {!hasMedia && <section className="absolute inset-0 flex w-full min-w-0 min-h-0 flex-1 flex-col" />}
                    </div>
                </Dialog.Popup>

                {/* Viewers */}
                <StoryViewersModal
                    open={showViewers}
                    onClose={handleHideViewers}
                    viewers={viewers}
                    loading={viewersLoading}
                    membersById={membersById}
                />

                {/* Confirm */}
                <ConfirmActionModal
                    open={showDeleteConfirm}
                    onCloseAction={handleCloseDeleteConfirm}
                    onConfirmAction={handleDelete}
                    title={t('deleteStoryConfirmTitle')}
                    body={t('deleteStoryConfirmBody')}
                    confirmLabel={t('deleteStoryConfirm')}
                    cancelLabel={t('cancel')}
                    isConfirming={deleteStory.isPending}
                />
            </Dialog.Portal>
        </Dialog.Root>
    );
}
