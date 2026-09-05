import type { CommentResponseDto, EventMemberResponseDto } from '@/lib/api/types';

export function authorNameFor(comment: CommentResponseDto, membersById: Map<string, EventMemberResponseDto>, unknownAuthorLabel: string) {
    const author = comment.authorMemberId ? membersById.get(comment.authorMemberId) : undefined;
    return author?.displayName ?? unknownAuthorLabel;
}

export interface CommentThread {
    comment: CommentResponseDto;
    replies: CommentResponseDto[];
}

// Nesting is flattened to a single level in the UI: a reply to a reply is
// attached to the original top-level comment's reply list instead of
// nesting further.
export function groupCommentsIntoThreads(comments: CommentResponseDto[]): CommentThread[] {
    const byId = new Map(comments.map((comment) => [comment.id, comment]));
    const threads = new Map<string, CommentThread>();
    const order: string[] = [];

    function topLevelIdFor(comment: CommentResponseDto): string {
        let current = comment;
        while (current.parentCommentId) {
            const parent = byId.get(current.parentCommentId);
            if (!parent) break;
            current = parent;
        }
        return current.id;
    }

    for (const comment of comments) {
        if (comment.parentCommentId) continue;
        threads.set(comment.id, { comment, replies: [] });
        order.push(comment.id);
    }

    for (const comment of comments) {
        if (!comment.parentCommentId) continue;
        const thread = threads.get(topLevelIdFor(comment));
        thread?.replies.push(comment);
    }

    return order.map((id) => threads.get(id)!);
}
