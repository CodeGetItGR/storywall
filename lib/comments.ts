import type { CommentResponseDto, EventMemberResponseDto } from '@/lib/api/types';

export function authorNameFor(comment: CommentResponseDto, membersById: Map<string, EventMemberResponseDto>, unknownAuthorLabel: string) {
    const author = comment.authorMemberId ? membersById.get(comment.authorMemberId) : undefined;
    return author?.displayName ?? unknownAuthorLabel;
}

export interface CommentThread {
    comment: CommentResponseDto;
    replies: CommentResponseDto[];
}

// Nesting is flattened to a single level in the UI (Instagram's model, not
// Facebook's): a reply to a reply is attached to the original top-level
// comment's reply list instead of nesting further. The addressee is kept
// visible via an "@Name " prefix the composer inserts into the reply text
// (see ReplyItem's onReply call) rather than a structural third level.
//
// Grouping is total and duplicate-safe:
//  - a comment id that appears more than once (e.g. an offset-pagination
//    shift across a delete landed it on two adjacent page fetches) is kept
//    only once, at its first occurrence;
//  - a reply is never silently dropped. If its parent chain resolves to a
//    loaded top-level comment, it's attached there. If the chain breaks
//    because some ancestor isn't in the loaded window, the reply becomes its
//    own top-level entry instead of vanishing.
export function groupCommentsIntoThreads(comments: CommentResponseDto[]): CommentThread[] {
    const deduped: CommentResponseDto[] = [];
    const seenIds = new Set<string>();
    for (const comment of comments) {
        if (seenIds.has(comment.id)) continue;
        seenIds.add(comment.id);
        deduped.push(comment);
    }

    const byId = new Map(deduped.map((comment) => [comment.id, comment]));
    const threads = new Map<string, CommentThread>();
    const order: string[] = [];

    function ensureThread(comment: CommentResponseDto) {
        if (!threads.has(comment.id)) {
            threads.set(comment.id, { comment, replies: [] });
            order.push(comment.id);
        }
    }

    for (const comment of deduped) {
        if (!comment.parentCommentId) ensureThread(comment);
    }

    // Resolves the top-level thread a reply ultimately belongs under,
    // walking up the parent chain and flattening any depth beyond one level.
    // Memoized so a long reply-to-reply-to-reply chain is only walked once.
    const resolvedThreadId = new Map<string, string>();
    function threadIdFor(comment: CommentResponseDto): string {
        const cached = resolvedThreadId.get(comment.id);
        if (cached) return cached;

        const parent = comment.parentCommentId ? byId.get(comment.parentCommentId) : undefined;
        const threadId = parent ? threadIdFor(parent) : comment.id;

        if (!parent) ensureThread(comment); // broken/absent ancestor — stand on its own
        resolvedThreadId.set(comment.id, threadId);
        return threadId;
    }

    for (const comment of deduped) {
        if (!comment.parentCommentId) continue;
        const threadId = threadIdFor(comment);
        if (threadId === comment.id) continue; // it became its own top-level thread above
        threads.get(threadId)!.replies.push(comment);
    }

    return order.map((id) => threads.get(id)!);
}
