import { describe, expect, it } from 'vitest';

import type { CommentResponseDto } from '@/lib/api/types';
import { groupCommentsIntoThreads } from '@/lib/comments';

function comment(id: string, parentCommentId: string | null = null): CommentResponseDto {
    return {
        id,
        postId: 'post-1',
        authorMemberId: 'm1',
        parentCommentId,
        content: id,
        createdAt: new Date(2026, 0, 1).toISOString(),
        updatedAt: new Date(2026, 0, 1).toISOString(),
        deletedAt: null,
    };
}

// Regression coverage for docs/specs/post-comment-reply-visibility.md (R4, R5).
describe('groupCommentsIntoThreads', () => {
    it('attaches a direct reply to its top-level comment', () => {
        const threads = groupCommentsIntoThreads([comment('c0'), comment('c1', 'c0')]);
        expect(threads).toHaveLength(1);
        expect(threads[0].replies.map((r) => r.id)).toEqual(['c1']);
    });

    it('flattens a reply-to-a-reply into the same top-level thread', () => {
        const threads = groupCommentsIntoThreads([comment('c0'), comment('c1', 'c0'), comment('c2', 'c1')]);
        expect(threads).toHaveLength(1);
        expect(threads[0].replies.map((r) => r.id)).toEqual(['c1', 'c2']);
    });

    it('is total: every input id appears exactly once, never dropped', () => {
        const orphan = comment('c2', 'c-not-loaded'); // parent outside the loaded window
        const threads = groupCommentsIntoThreads([comment('c0'), comment('c1'), orphan]);
        const renderedIds = threads.flatMap((t) => [t.comment.id, ...t.replies.map((r) => r.id)]);
        expect(renderedIds.sort()).toEqual(['c0', 'c1', 'c2']);
    });

    it('attaches to the nearest loaded ancestor when a middle link of the chain is missing', () => {
        // c0 (top) <- c1 (missing) <- c2 (reply to c1). c1 isn't loaded, so c2
        // becomes its own top-level entry rather than vanishing.
        const threads = groupCommentsIntoThreads([comment('c0'), comment('c2', 'c1')]);
        const renderedIds = threads.flatMap((t) => [t.comment.id, ...t.replies.map((r) => r.id)]);
        expect(renderedIds.sort()).toEqual(['c0', 'c2']);
        expect(threads.find((t) => t.comment.id === 'c2')).toBeDefined();
    });

    it('collapses a duplicate id (e.g. from an offset-pagination shift) to a single entry', () => {
        const reply = comment('c1', 'c0');
        const threads = groupCommentsIntoThreads([comment('c0'), reply, reply]);
        expect(threads[0].replies.map((r) => r.id)).toEqual(['c1']);
    });

    it('preserves arrival order for top-level threads and for replies within a thread', () => {
        const threads = groupCommentsIntoThreads([comment('c0'), comment('c1'), comment('r0', 'c0'), comment('r1', 'c1'), comment('r2', 'c0')]);
        expect(threads.map((t) => t.comment.id)).toEqual(['c0', 'c1']);
        expect(threads[0].replies.map((r) => r.id)).toEqual(['r0', 'r2']);
        expect(threads[1].replies.map((r) => r.id)).toEqual(['r1']);
    });
});
