'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { type SyntheticEvent, useEffect, useMemo, useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { StoryCaptionBar, StoryHeader, StoryProgressBar, StoryViewersModal } from '@/components/story';
import { StoryVideo } from '@/components/story/StoryVideo';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDeleteStory, useEventMembers, useEventStories, useMarkStoryViewed, useMediaItem, useStory, useStoryViews } from '@/hooks';
import { ApiError } from '@/lib/api/client';
import { isEventWritable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { groupStoriesByAuthor } from '@/lib/stories';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

export default function StoryBoundary({ id }: { id: string }) {
    const t = useTranslations('StoryPage');
    const locale = useLocale();
    const router = useRouter();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const isHost = useIsHost();

    const { data: story, error: storyError } = useStory(id);
    const eventId = story?.eventId ?? null;
    const { data: media } = useMediaItem(story?.mediaId ?? null);
    const { data: allStories = [] } = useEventStories(eventId);
    const { data: members = [] } = useEventMembers(eventId);
    const markViewed = useMarkStoryViewed();
    const deleteStory = useDeleteStory(eventId ?? '');

    const [progress, setProgress] = useState(0);
    const [mediaLoaded, setMediaLoaded] = useState(false);
    const [showViewers, setShowViewers] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Reset progress synchronously during render when navigating to a
    // different story, instead of via an effect (see react.dev/learn/you-might-not-need-an-effect).
    const [prevStoryId, setPrevStoryId] = useState(id);
    if (id !== prevStoryId) {
        setPrevStoryId(id);
        setProgress(0);
        setMediaLoaded(false);
    }

    const groups = useMemo(() => groupStoriesByAuthor(allStories, { filterExpired: false }), [allStories]);
    const groupIndex = groups.findIndex((g) => g.stories.some((s) => s.id === id));
    const group = groupIndex >= 0 ? groups[groupIndex] : null;
    const storyIndex = group ? group.stories.findIndex((s) => s.id === id) : -1;

    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
    const author = story?.authorMemberId ? membersById.get(story.authorMemberId) : undefined;
    const canWrite = isEventWritable(activeEvent?.status);
    const canManage = Boolean(story && activeMember && (activeMember.id === story.authorMemberId || isHost));
    const canDeleteStory = canManage && canWrite;

    const { data: viewers = [], isFetching: viewersLoading } = useStoryViews(showViewers ? id : null);

    const isVideoStory = media?.mediaType === 'VIDEO';
    const canRunStoryTimer = Boolean(media && mediaLoaded);

    function handleMediaLoaded() {
        setMediaLoaded(true);
    }

    function handleVideoTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
        if (!mediaLoaded) return;
        const video = event.currentTarget;
        if (!video.duration) return;
        setProgress(Math.min(100, (video.currentTime / video.duration) * 100));
    }

    function handleVideoEnded() {
        setProgress(100);
        goNext();
    }

    // Mark viewed once per opened story. Idempotent server-side, so no
    // client-side "already sent" guard is needed.
    useEffect(() => {
        markViewed.mutate(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Auto-advance progress bar. Deliberately keyed on `id` alone (not
    // `group`/`groupIndex`, which are recomputed whenever useEventStories
    // background-refetches) so a refetch mid-story doesn't reset progress.
    useEffect(() => {
        if (!canRunStoryTimer || isVideoStory) return;

        const interval = setInterval(() => {
            setProgress((p) => {
                if (p >= 100) {
                    clearInterval(interval);
                    goNext();
                    return 100;
                }
                return p + 2;
            });
        }, 100);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canRunStoryTimer, id, isVideoStory]);

    if (storyError instanceof ApiError && storyError.status === 404) {
        router.replace(routes.feed);
        return null;
    }

    if (!story || !group || storyIndex < 0) return null;

    const storyEventId = story.eventId;

    function goNext() {
        if (!group) return;
        if (storyIndex < group.stories.length - 1) {
            router.replace(routes.events.story(storyEventId, group.stories[storyIndex + 1].id));
            return;
        }
        const nextGroup = groups[groupIndex + 1];
        if (nextGroup) {
            router.replace(routes.events.story(storyEventId, nextGroup.stories[0].id));
        } else {
            router.replace(routes.events.feed(storyEventId));
        }
    }

    function goPrev() {
        if (!group) return;
        if (storyIndex > 0) {
            router.replace(routes.events.story(storyEventId, group.stories[storyIndex - 1].id));
            return;
        }
        const prevGroup = groups[groupIndex - 1];
        if (prevGroup) {
            router.replace(routes.events.story(storyEventId, prevGroup.stories[prevGroup.stories.length - 1].id));
        }
    }

    function handleCloseStory() {
        router.back();
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
        await deleteStory.mutateAsync(id);
        goNext();
    }

    const timeStr = new Date(story.createdAt).toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit',
    });
    const authorName = author?.displayName ?? t('unknownAuthor');

    return (
        <div className="motion-story-route fixed inset-0 z-50 flex h-dvh flex-col items-center justify-center overflow-hidden bg-ink">
            <div className="relative h-dvh w-full max-w-sm overflow-hidden bg-black">
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
                            sizes="400px"
                            priority
                            onLoadingComplete={handleMediaLoaded}
                        />
                    ))}

                {/* Tap zones */}
                <button onClick={goPrev} className="absolute left-0 top-0 w-1/3 h-full z-10" aria-label={t('previousStory')} />
                <button onClick={goNext} className="absolute right-0 top-0 w-1/3 h-full z-10" aria-label={t('nextStory')} />

                {/* Nav arrows — desktop hint */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex">
                    <button
                        onClick={goPrev}
                        aria-label={t('previous')}
                        className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex">
                    <button
                        onClick={goNext}
                        aria-label={t('next')}
                        className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <StoryCaptionBar story={story} canManage={canManage} onShowViewersAction={handleShowViewers} />
            </div>

            <StoryViewersModal open={showViewers} onClose={handleHideViewers} viewers={viewers} loading={viewersLoading} membersById={membersById} />
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
        </div>
    );
}
