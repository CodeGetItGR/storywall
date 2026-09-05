import { useTranslations } from 'next-intl';
import type React from 'react';
import { useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateComment, usePostComments } from '@/hooks/useComments';
import { isModuleNotAvailableError } from '@/lib/api/errors';
import type { CommentResponseDto } from '@/lib/api/types';

export interface ReplyTarget {
    parentCommentId: string;
    authorName: string;
}

export interface AutoExpandThread {
    threadId: string;
    nonce: number;
}

// Owns everything about a post's comment thread: fetching + pagination,
// posting, reply targeting, and the client-side "pending comment" list that
// makes a just-posted comment/reply show up immediately, in its final
// position, and stay there — see docs/specs/post-comment-reply-visibility.md.
//
// Why pending comments, not a cache write: comments paginate oldest-first, so
// a brand-new one belongs on whichever page turns out to be last — almost
// never the page(s) currently loaded. There is no page to hand-append it to
// that a later refetch of the loaded range wouldn't erase again. Instead this
// hook tracks comments created during the current viewing session as plain
// state, appends them to the end of the rendered list (their genuinely
// correct position, since they're newer than anything loaded), and drops
// each one the moment the real paginated data contains its id — same
// content, same position, no visible change.
export function usePostCommentThread(postId: string | null, eventId: string, canComment: boolean) {
    const t = useTranslations('PostModal');
    const toErrorMessage = useApiErrorMessage();

    const {
        data: commentPages,
        fetchNextPage: onLoadMoreComments,
        hasNextPage: hasMoreComments,
        isFetchingNextPage: isLoadingMoreComments,
        isFetching: isFetchingComments,
    } = usePostComments(postId);
    const createComment = useCreateComment(eventId);

    const serverComments = useMemo(() => commentPages?.pages.flatMap((page) => page.content) ?? [], [commentPages?.pages]);

    // Comments this member posted in this viewing session. Reset whenever the
    // post changes (the modal was reopened on a different post) — adjusted
    // during render rather than in an effect, per
    // https://react.dev/learn/you-might-not-need-an-effect.
    const [pendingComments, setPendingComments] = useState<CommentResponseDto[]>([]);
    const [pendingForPostId, setPendingForPostId] = useState(postId);
    if (postId !== pendingForPostId) {
        setPendingForPostId(postId);
        setPendingComments([]);
    }

    const comments = useMemo(() => {
        if (pendingComments.length === 0) return serverComments;
        const serverIds = new Set(serverComments.map((c) => c.id));
        return [...serverComments, ...pendingComments.filter((c) => !serverIds.has(c.id))];
    }, [serverComments, pendingComments]);

    // The header count and the rendered list must never disagree — fold in
    // pending comments the server hasn't reported back yet rather than
    // waiting on a refetch.
    const stillPendingCount = comments.length - serverComments.length;

    const [commentText, setCommentText] = useState('');
    const [commentError, setCommentError] = useState<string | null>(null);
    const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
    const [autoExpandThread, setAutoExpandThread] = useState<AutoExpandThread | null>(null);
    const [lastPostedCommentId, setLastPostedCommentId] = useState<string | null>(null);

    async function onSubmit(e: React.SubmitEvent<HTMLFormElement>, authorMemberId: string | undefined) {
        e.preventDefault();
        const content = commentText.trim();
        if (!content || !postId || !authorMemberId || !canComment) return;

        setCommentError(null);

        let created: CommentResponseDto;
        try {
            created = await createComment.mutateAsync({
                postId,
                authorMemberId,
                content,
                parentCommentId: replyTarget?.parentCommentId,
            });
        } catch (error) {
            setCommentError(isModuleNotAvailableError(error) ? t('moduleUnavailable') : toErrorMessage(error, t('commentFailed')));
            return;
        }

        setPendingComments((current) => [...current, created]);
        setLastPostedCommentId(created.id);
        if (replyTarget) setAutoExpandThread({ threadId: replyTarget.parentCommentId, nonce: Date.now() });
        setCommentText('');
        setReplyTarget(null);
    }

    // Replying to the thread's top-level comment needs no addressee — it's
    // the only thing being replied to. Replying to a reply (flattened to the
    // same level) prefixes the composer with "@Name " so readers can still
    // tell who a reply-to-a-reply is answering, the same convention
    // Instagram uses instead of a third nesting level.
    function onReply(parentCommentId: string, authorName: string, mention?: boolean) {
        setCommentError(null);
        setReplyTarget({ parentCommentId, authorName });
        if (mention) setCommentText(`@${authorName} `);
    }

    function onCancelReply() {
        setReplyTarget(null);
    }

    return {
        comments,
        hasMoreComments,
        isLoadingMoreComments,
        isFetchingComments,
        onLoadMoreComments,
        commentCountDelta: stillPendingCount,
        commentText,
        onCommentTextChange: setCommentText,
        commentError,
        setCommentError,
        onSubmit,
        submitDisabled: !commentText.trim() || createComment.isPending || !canComment,
        replyTarget,
        onReply,
        onCancelReply,
        autoExpandThread,
        lastPostedCommentId,
    };
}
