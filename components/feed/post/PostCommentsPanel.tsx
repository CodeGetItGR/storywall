'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';

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
    comments: CommentResponseDto[];
    hasMoreComments: boolean;
    isLoadingMoreComments: boolean;
    onLoadMoreComments: () => void;
    membersById: Map<string, EventMemberResponseDto>;
    timeAgo: { unit: 'now' | 'minutes' | 'hours' | 'days'; value: number };
    commentText: string;
    onCommentTextChange: (value: string) => void;
    commentError: string | null;
    onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
    submitDisabled: boolean;
    inputDisabled?: boolean;
    maxCommentLength: number;
    reactionTypes: ReactionTypeResponseDto[];
}

export function PostCommentsPanel({
    post,
    comments,
    hasMoreComments,
    isLoadingMoreComments,
    onLoadMoreComments,
    membersById,
    timeAgo,
    commentText,
    onCommentTextChange,
    commentError,
    onSubmit,
    submitDisabled,
    inputDisabled,
    maxCommentLength,
    reactionTypes,
}: PostCommentsPanelProps) {
    const t = useTranslations('PostModal');
    const loadMoreRef = useInfiniteScrollSentinel(hasMoreComments, onLoadMoreComments, comments.length);

    return (
        <>
            <section className="border-b flex justify-between pb-2 px-3 shrink-0 pt-2">
                <PostHeader post={post} timeAgo={timeAgo} />
                <div className="flex gap-2">
                    <ReactionSummary count={post.reactionCount} counts={post.reactionCounts} reactionTypes={reactionTypes} />
                    <CommentCount count={post.commentCount} />
                </div>
            </section>
            <Modal.Body
                className={cn('lg:px-4 px-3 pt-5 pb-4', {
                    'flex items-center justify-center': comments.length === 0,
                })}
            >
                <h3 className="text-sm font-bold text-ink mb-4">
                    {post.commentCount === 0 ? t('noCommentsYet') : t('commentCount', { count: post.commentCount })}
                </h3>
                <CommentsList comments={comments} membersById={membersById} />
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
                placeholder={t('commentPlaceholder')}
                inputAriaLabel={t('commentTextAriaLabel')}
                submitAriaLabel={t('postComment')}
                maxLength={maxCommentLength}
            />
        </>
    );
}
