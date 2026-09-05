'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';
import { useEffect, useRef } from 'react';

import { CommentCount } from '@/components/feed/post/CommentCount';
import { PostCommentForm } from '@/components/feed/post/PostCommentForm';
import { PostHeader } from '@/components/feed/post/PostHeader';
import { ReactionSummary } from '@/components/feed/post/ReactionSummary';
import { Modal } from '@/components/ui/modal';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import type { CommentResponseDto, EventMemberResponseDto, PostResponseDto, ReactionTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import { CommentsList } from './CommentsList';

interface PostCommentsPanelProps {
    post: PostResponseDto;
    commentCount: number;
    comments: CommentResponseDto[];
    hasMoreComments: boolean;
    isLoadingMoreComments: boolean;
    isFetchingComments: boolean;
    onLoadMoreComments: () => void;
    membersById: Map<string, EventMemberResponseDto>;
    commentText: string;
    onCommentTextChange: (value: string) => void;
    commentError: string | null;
    onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
    submitDisabled: boolean;
    inputDisabled?: boolean;
    maxCommentLength: number;
    reactionTypes: ReactionTypeResponseDto[];
    replyTarget: { authorName: string } | null;
    onReply: (parentCommentId: string, authorName: string, mention?: boolean) => void;
    onCancelReply: () => void;
    autoExpandThread: { threadId: string; nonce: number } | null;
    // Scrolled into view once, right after it's posted — see the effect below.
    lastPostedCommentId: string | null;
}

export function PostCommentsPanel({
    post,
    commentCount,
    comments,
    hasMoreComments,
    isLoadingMoreComments,
    isFetchingComments,
    onLoadMoreComments,
    membersById,
    commentText,
    onCommentTextChange,
    commentError,
    onSubmit,
    submitDisabled,
    inputDisabled,
    maxCommentLength,
    reactionTypes,
    replyTarget,
    onReply,
    onCancelReply,
    autoExpandThread,
    lastPostedCommentId,
}: PostCommentsPanelProps) {
    const t = useTranslations('PostModal');
    const loadMoreRef = useInfiniteScrollSentinel(hasMoreComments, onLoadMoreComments, comments.length, isFetchingComments);
    const bodyRef = useRef<HTMLDivElement>(null);

    // A member posting into a long thread sees nothing move if their own
    // comment lands off-screen below the fold — which reads as the post
    // having silently failed. Bring it into view once, the same beat
    // autoExpandThread reveals its thread.
    useEffect(() => {
        if (!lastPostedCommentId || !bodyRef.current) return;
        const node = bodyRef.current.querySelector(`[data-comment-id="${lastPostedCommentId}"]`);
        node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [lastPostedCommentId]);

    return (
        <>
            <section className="flex justify-between pb-2 px-3 shrink-0 pt-2">
                {/*<PostHeader post={post} timeAgo={timeAgo} />*/}
                <div className="flex gap-2">
                    <ReactionSummary counts={post.reactionCounts} reactionTypes={reactionTypes} />
                    {/*<CommentCount count={commentCount} />*/}
                </div>
            </section>
            <Modal.Body
                ref={bodyRef}
                className={cn('lg:px-4 px-3 pt-5 pb-4', {
                    'flex items-center justify-center': comments.length === 0,
                })}
            >
                {/* The count already lives in the header above — this heading
                    only carries the empty state, never restates the number. */}
                {commentCount === 0 && <h3 className="text-sm font-bold text-ink mb-4">{t('noCommentsYet')}</h3>}
                <CommentsList comments={comments} membersById={membersById} onReply={onReply} autoExpandThread={autoExpandThread} />
                <div ref={loadMoreRef} className="h-1" />
                {isLoadingMoreComments && <p className="pt-2 text-center text-xs text-ink-muted">{t('loadingMore')}</p>}
            </Modal.Body>

            <PostCommentForm
                value={commentText}
                onValueChange={onCommentTextChange}
                onSubmit={onSubmit}
                error={commentError}
                submitDisabled={submitDisabled}
                inputDisabled={inputDisabled}
                placeholder={replyTarget ? t('replyPlaceholder') : t('commentPlaceholder')}
                inputAriaLabel={t('commentTextAriaLabel')}
                submitAriaLabel={t('postComment')}
                maxLength={maxCommentLength}
                replyingToLabel={replyTarget ? t('replyingTo', { name: replyTarget.authorName }) : null}
                onCancelReply={onCancelReply}
                cancelReplyAriaLabel={t('cancelReply')}
            />
        </>
    );
}
