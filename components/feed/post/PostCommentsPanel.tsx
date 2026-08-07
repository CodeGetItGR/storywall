'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';

import { CommentCount } from '@/components/feed/post/CommentCount';
import { PostCommentForm } from '@/components/feed/post/PostCommentForm';
import { PostHeader } from '@/components/feed/post/PostHeader';
import { ReactionCount } from '@/components/feed/post/ReactionCount';
import { Modal } from '@/components/ui/modal';
import type { CommentResponseDto, EventMemberResponseDto, PostResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import { CommentsList } from './CommentsList';

interface PostCommentsPanelProps {
    post: PostResponseDto;
    comments: CommentResponseDto[];
    membersById: Map<string, EventMemberResponseDto>;
    timeAgo: { unit: 'now' | 'minutes' | 'hours' | 'days'; value: number };
    commentText: string;
    onCommentTextChange: (value: string) => void;
    commentError: string | null;
    onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
    submitDisabled: boolean;
    inputDisabled?: boolean;
}

export function PostCommentsPanel({
    post,
    comments,
    membersById,
    timeAgo,
    commentText,
    onCommentTextChange,
    commentError,
    onSubmit,
    submitDisabled,
    inputDisabled,
}: PostCommentsPanelProps) {
    const t = useTranslations('PostModal');

    return (
        <>
            <section className="border-b flex justify-between pb-2 px-3 shrink-0 pt-2">
                <PostHeader post={post} timeAgo={timeAgo} />
                <div className="flex gap-2">
                    <ReactionCount count={post.reactionCount} />
                    <CommentCount count={post.commentCount} />
                </div>
            </section>
            <Modal.Body
                className={cn('lg:px-4 px-3 pt-5 pb-4', {
                    'flex items-center justify-center': comments.length === 0,
                })}
            >
                <h3 className="text-sm font-bold text-ink mb-4">{comments.length === 0 ? t('noCommentsYet') : t('commentCount', { count: comments.length })}</h3>
                <CommentsList comments={comments} membersById={membersById} />
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
            />
        </>
    );
}
