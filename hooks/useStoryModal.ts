'use client';

import { type SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useDeleteStory, useEventMembers, useEventStories, useMarkStoryViewed, useMediaItem, useStory } from '@/hooks';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import { ApiError } from '@/lib/api/client';
import type { EventMemberResponseDto, MediaResponseDto, StoryResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { findAdjacentGroup, groupStoriesByAuthor, type StoryGroup } from '@/lib/stories';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

type UseStoryModalArgs = {
    open: boolean;
    storyId: string | null;
    onCloseAction: () => void;
};

// How long a story waits for its media before treating it as failed and
// auto-advancing, and how long the resulting error message stays on screen.
const MEDIA_LOAD_TIMEOUT_MS = 5000;
const MEDIA_ERROR_DISPLAY_MS = 1500;

export interface StoryModalController {
    onOpenChange: (nextOpen: boolean) => void;
    currentStoryId: string | null;
    storyNotFound: boolean;
    activeStory: StoryResponseDto | null;
    group: StoryGroup | null;
    storyIndex: number;
    media: MediaResponseDto | undefined;
    author: EventMemberResponseDto | undefined;
    progress: number;
    showMenu: boolean;
    showDeleteConfirm: boolean;
    canManage: boolean;
    canDeleteStory: boolean;
    isVideoStory: boolean;
    isDeleting: boolean;
    mediaError: boolean;
    goNext: () => void;
    goPrev: () => void;
    handleCloseStory: () => void;
    handleToggleMenu: () => void;
    handleDeleteRequest: () => void;
    handleCloseDeleteConfirm: () => void;
    handleDelete: () => Promise<void>;
    handleMediaLoaded: () => void;
    handleMediaError: () => void;
    handleVideoTimeUpdate: (event: SyntheticEvent<HTMLVideoElement>) => void;
    handleVideoEnded: () => void;
}

export function useStoryModal({ open, storyId, onCloseAction }: UseStoryModalArgs): StoryModalController {
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const isHost = useIsHost();

    const [activeStoryId, setActiveStoryId] = useState<string | null>(storyId);
    const [progress, setProgress] = useState(0);
    const [mediaLoaded, setMediaLoaded] = useState(false);
    const [mediaError, setMediaError] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    // The order authors appear in when the viewer opens, frozen so that
    // marking an author's last story as viewed (which re-sorts `groups`,
    // unseen-first) can't shift them out from under an in-progress "next
    // author" lookup mid-session.
    const [frozenGroupOrder, setFrozenGroupOrder] = useState<string[]>([]);
    const { requestClose } = useOverlayHistory(open, onCloseAction);

    const currentStoryId = open ? (activeStoryId ?? storyId) : activeStoryId;

    const { data: story, error: storyError } = useStory(currentStoryId);
    const eventId = story?.eventId ?? activeEvent?.id ?? null;
    const { data: allStories = [] } = useEventStories(eventId);
    const activeStory = story ?? allStories.find((item) => item.id === currentStoryId) ?? null;
    const { data: media } = useMediaItem(activeStory?.mediaId ?? null);
    const { data: members = [] } = useEventMembers(eventId);
    const markViewed = useMarkStoryViewed();
    const deleteStory = useDeleteStory(eventId ?? '');

    const groups = useMemo(() => groupStoriesByAuthor(allStories, { filterExpired: false }), [allStories]);
    const group = activeStory?.authorMemberId ? (groups.find((g) => g.authorMemberId === activeStory.authorMemberId) ?? null) : null;
    const storyIndex = group ? group.stories.findIndex((s) => s.id === currentStoryId) : -1;

    // Reset the viewer state whenever the popup opens or advances to a different story.
    const [prevStoryState, setPrevStoryState] = useState({ open, storyId, currentStoryId });
    if (open !== prevStoryState.open || storyId !== prevStoryState.storyId || currentStoryId !== prevStoryState.currentStoryId) {
        setPrevStoryState({ open, storyId, currentStoryId });
        setProgress(0);
        setMediaLoaded(false);
        setMediaError(false);
        setShowMenu(false);
        setShowDeleteConfirm(false);
        if (!open) {
            setActiveStoryId(null);
        } else if (storyId !== prevStoryState.storyId || open !== prevStoryState.open) {
            setActiveStoryId(storyId);
        }
        if (open && !prevStoryState.open) {
            setFrozenGroupOrder(groups.map((g) => g.authorMemberId));
        }
    }

    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
    const author = activeStory?.authorMemberId ? membersById.get(activeStory.authorMemberId) : undefined;
    const canWrite = isEventWritable(activeEvent?.status);
    const canManage = Boolean(activeStory && activeMember && (activeMember.id === activeStory.authorMemberId || isHost));
    const canDeleteStory = canManage && canWrite;
    const canAdvanceStory = Boolean(activeStory && group && storyIndex >= 0);

    function goNext() {
        if (!group || storyIndex < 0) {
            onCloseAction();
            return;
        }
        if (storyIndex < group.stories.length - 1) {
            setActiveStoryId(group.stories[storyIndex + 1].id);
            return;
        }
        const nextGroup = findAdjacentGroup(frozenGroupOrder, group.authorMemberId, groups, 1);
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
        const prevGroup = findAdjacentGroup(frozenGroupOrder, group.authorMemberId, groups, -1);
        if (prevGroup) {
            setActiveStoryId(prevGroup.stories[prevGroup.stories.length - 1].id);
        }
    }

    function handleTimerComplete() {
        if (!group || storyIndex < 0) {
            onCloseAction();
            return;
        }

        goNext();
    }

    const isVideoStory = media?.mediaType === 'VIDEO';
    const canRunStoryTimer = Boolean(media && mediaLoaded && !mediaError);

    function handleMediaLoaded() {
        setMediaLoaded(true);
    }

    function handleMediaError() {
        setMediaError(true);
    }

    function handleVideoTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
        if (!mediaLoaded) return;
        const video = event.currentTarget;
        if (!video.duration) return;
        setProgress(Math.min(100, (video.currentTime / video.duration) * 100));
    }

    function handleVideoEnded() {
        setProgress(100);
        handleTimerComplete();
    }

    function handleCloseStory() {
        requestClose();
    }

    function handleToggleMenu() {
        setShowMenu((v) => !v);
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
        if (!open || !currentStoryId || !canAdvanceStory || !canRunStoryTimer || isVideoStory) return;

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
    }, [canAdvanceStory, canRunStoryTimer, currentStoryId, isVideoStory, open]);

    useEffect(() => {
        if (!open) return;
        if (storyError instanceof ApiError && storyError.status === 404) {
            onCloseAction();
        }
    }, [onCloseAction, open, storyError]);

    useEffect(() => {
        if (!open || !currentStoryId || !activeStory) return;
        if (!group || storyIndex < 0) {
            onCloseAction();
        }
    }, [activeStory, currentStoryId, group, onCloseAction, open, storyIndex]);

    // A story's media may be missing entirely, or present but broken/slow. Either
    // way it never fires onLoad, so without this it would hang forever with a
    // dead timer. Give it MEDIA_LOAD_TIMEOUT_MS before treating it as failed.
    useEffect(() => {
        if (!open || !currentStoryId || mediaLoaded || mediaError) return;

        const timeout = setTimeout(() => setMediaError(true), MEDIA_LOAD_TIMEOUT_MS);
        return () => clearTimeout(timeout);
    }, [currentStoryId, mediaError, mediaLoaded, open]);

    useEffect(() => {
        if (!open || !mediaError) return;

        const timeout = setTimeout(() => handleTimerComplete(), MEDIA_ERROR_DISPLAY_MS);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaError, open]);

    const storyNotFound = storyError instanceof ApiError && storyError.status === 404;

    return {
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
        isDeleting: deleteStory.isPending,
        mediaError,
        goNext,
        goPrev,
        handleCloseStory,
        handleToggleMenu,
        handleDeleteRequest,
        handleCloseDeleteConfirm,
        handleDelete,
        handleMediaLoaded,
        handleMediaError,
        handleVideoTimeUpdate,
        handleVideoEnded,
    };
}
