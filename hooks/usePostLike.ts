import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveMember } from "@/providers/EventProvider";
import { useCreateReaction, useDeleteReaction, reactionKeys, fetchPostReactions } from "@/hooks/useReactions";
import { patchPostInCaches } from "@/hooks/usePosts";
import type { PostResponseDto } from "@/lib/api/types";

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
  const activeMember = useActiveMember();
  const createReaction = useCreateReaction();
  const deleteReaction = useDeleteReaction(post.id);
  // Assumes at most one mounted instance of a given post's like button is interactive at a time —
  // true today since PostModal's fixed-overlay backdrop blocks clicks on the feed behind it.
  const [isToggling, setIsToggling] = useState(false);

  async function toggle() {
    if (!activeMember || isToggling) return;

    const reactionKey = `${post.id}:${activeMember.id}`;
    const wasLiked = post.likedByCurrentUser;
    const previousCount = post.reactionCount;

    setIsToggling(true);
    patchPostInCaches(queryClient, post.eventId, post.id, {
      likedByCurrentUser: !wasLiked,
      reactionCount: previousCount + (wasLiked ? -1 : 1),
    });

    try {
      if (!wasLiked) {
        const reaction = await createReaction.mutateAsync({
          postId: post.id,
          memberId: activeMember.id,
          reactionType: "LIKE",
        });
        knownReactionIds.set(reactionKey, reaction.id);
      } else {
        let reactionId = knownReactionIds.get(reactionKey);
        if (!reactionId) {
          const reactions = await queryClient.fetchQuery({
            queryKey: reactionKeys.list(post.id),
            queryFn: () => fetchPostReactions(post.id),
          });
          reactionId = reactions.find((r) => r.memberId === activeMember.id)?.id;
        }
        if (!reactionId) {
          throw new Error("Could not resolve reaction id to unlike");
        }
        await deleteReaction.mutateAsync(reactionId);
        // If mutateAsync throws, execution jumps straight to catch and this line is skipped on
        // purpose — the id is retained for a retry since nothing was actually deleted server-side.
        knownReactionIds.delete(reactionKey);
      }
    } catch {
      patchPostInCaches(queryClient, post.eventId, post.id, {
        likedByCurrentUser: wasLiked,
        reactionCount: previousCount,
      });
    } finally {
      setIsToggling(false);
    }
  }

  return { liked: post.likedByCurrentUser, count: post.reactionCount, toggle, isPending: isToggling };
}
