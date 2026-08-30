import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { appConfigKeys, useAppConfig } from '@/hooks/useAppConfig';
import { patchPostInCaches } from '@/hooks/usePosts';
import { fetchPostReactions, reactionKeys, useCreateReaction, useDeleteReaction } from '@/hooks/useReactions';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { EventTypeConvention, PostResponseDto } from '@/lib/api/types';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

// Reaction ids created this session, so unliking right after liking never
// needs to re-fetch the reactor list to find what to delete. Keyed by
// `${postId}:${memberId}` — module-level so it survives PostCard/PostModal
// remounts within the session; resets on a full page reload, which the
// fallback below covers (a one-time reactor-list lookup). Keying by member
// too (not just postId) avoids reusing a stale id for the wrong member if
// the active member changes within the same tab without a reload.
const knownReactionIds = new Map<string, string>();

export function usePostLike(post: PostResponseDto) {
    const queryClient = useQueryClient();
    const { data: appConfig } = useAppConfig();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const createReaction = useCreateReaction();
    const deleteReaction = useDeleteReaction(post.id);
    // Assumes at most one mounted instance of a given post's like button is interactive at a time —
    // true today since PostModal's fixed-overlay backdrop blocks clicks on the feed behind it.
    const [isToggling, setIsToggling] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const eventType = post.eventType ?? activeEvent?.eventType;
    const options = eventType ? (appConfig?.reactionTypesByEventType[eventType] ?? []) : [];
    const selectedType = post.myReactionType;

    function patchReaction(nextType: string | null) {
        const previousType = post.myReactionType;
        const previousCounts = post.reactionCounts ?? {};
        const nextCounts = { ...previousCounts };
        let nextTotal = post.reactionCount;

        if (previousType) {
            const count = Math.max(0, (nextCounts[previousType] ?? 0) - 1);
            if (count === 0) delete nextCounts[previousType];
            else nextCounts[previousType] = count;
            nextTotal = Math.max(0, nextTotal - 1);
        }

        if (nextType) {
            nextCounts[nextType] = (nextCounts[nextType] ?? 0) + 1;
            nextTotal += 1;
        }

        patchPostInCaches(queryClient, post.eventId, post.id, {
            myReactionType: nextType,
            reactionCounts: nextCounts,
            reactionCount: nextTotal,
        });
    }

    async function selectReaction(reactionType: string) {
        if (!activeMember || isToggling) return;
        if (!options.some((option) => option.code === reactionType)) return;

        const reactionKey = `${post.id}:${activeMember.id}`;
        const previousType = post.myReactionType;
        const previousCount = post.reactionCount;
        const previousCounts = post.reactionCounts;

        setError(null);
        setIsToggling(true);
        patchReaction(reactionType);

        try {
            const reaction = await createReaction.mutateAsync({
                postId: post.id,
                memberId: activeMember.id,
                reactionType,
            });
            knownReactionIds.set(reactionKey, reaction.id);
        } catch (err) {
            setError(err);
            if (getErrorCode(err) === ERROR_CODES.RESOURCE_NOT_FOUND || getErrorCode(err) === ERROR_CODES.REACTION_TYPE_NOT_USABLE) {
                queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
            }
            patchPostInCaches(queryClient, post.eventId, post.id, {
                myReactionType: previousType,
                reactionCount: previousCount,
                reactionCounts: previousCounts,
            });
        } finally {
            setIsToggling(false);
        }
    }

    async function clearReaction() {
        if (!activeMember || isToggling || !post.myReactionType) return;

        const reactionKey = `${post.id}:${activeMember.id}`;
        const previousType = post.myReactionType;
        const previousCount = post.reactionCount;
        const previousCounts = post.reactionCounts;

        setError(null);
        setIsToggling(true);
        patchReaction(null);

        try {
            let reactionId = knownReactionIds.get(reactionKey);
            if (!reactionId) {
                const reactions = await queryClient.fetchQuery({
                    queryKey: reactionKeys.list(post.id),
                    queryFn: () => fetchPostReactions(post.id),
                });
                reactionId = reactions.find((r) => r.memberId === activeMember.id)?.id;
            }
            if (!reactionId) throw new Error('Could not resolve reaction id to remove');

            await deleteReaction.mutateAsync(reactionId);
            // Keep the id for retry if delete throws; remove only after the server confirms.
            knownReactionIds.delete(reactionKey);
        } catch (err) {
            setError(err);
            patchPostInCaches(queryClient, post.eventId, post.id, {
                myReactionType: previousType,
                reactionCount: previousCount,
                reactionCounts: previousCounts,
            });
        } finally {
            setIsToggling(false);
        }
    }

    return {
        liked: selectedType !== null,
        selectedType,
        selectedOption: options.find((option) => option.code === selectedType) ?? null,
        options,
        count: post.reactionCount,
        counts: post.reactionCounts,
        toggle: () => {
            const fallbackType = selectedType ?? options[0]?.code;
            if (fallbackType) void selectReaction(fallbackType);
        },
        selectReaction,
        clearReaction,
        isPending: isToggling,
        error,
        eventType: eventType as EventTypeConvention | undefined,
    };
}
