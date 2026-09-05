'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { PostCommentsPanel } from '@/components/feed/post';
import { Modal } from '@/components/ui/modal';
import { useCreateComment, useEventMembers, usePost, usePostComments, usePostModal } from '@/hooks';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ApiError } from '@/lib/api/client';
import { isModuleNotAvailableError } from '@/lib/api/errors';
import { isEventWritable } from '@/lib/eventLifecycle';
import { timeAgoParts } from '@/lib/utils';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

export function PostModal() {
    const t = useTranslations('PostModal');
    const toErrorMessage = useApiErrorMessage();
    const { postId, isOpen, close } = usePostModal();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const { data: post, error, isPending } = usePost(postId);
    const {
        data: commentPages,
        fetchNextPage: fetchMoreComments,
        hasNextPage: hasMoreComments,
        isFetchingNextPage: isLoadingMoreComments,
    } = usePostComments(postId);
    const comments = useMemo(() => commentPages?.pages.flatMap((page) => page.content) ?? [], [commentPages?.pages]);
    const { data: members = [] } = useEventMembers(post?.eventId ?? null);
    const { data: appConfig } = useAppConfig();
    const createComment = useCreateComment(post?.eventId ?? '');
    const [commentText, setCommentText] = useState('');
    const [commentError, setCommentError] = useState<string | null>(null);
    const [replyTarget, setReplyTarget] = useState<{ parentCommentId: string; authorName: string } | null>(null);
    const [autoExpandThread, setAutoExpandThread] = useState<{ threadId: string; nonce: number } | null>(null);

    const timeAgo = useMemo(
        () =>
            post
                ? timeAgoParts(post?.createdAt)
                : {
                      unit: 'minutes' as const,
                      value: 0,
                  },
        [post]
    );

    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
    const canComment = Boolean(activeMember) && isEventWritable(activeEvent?.status);
    const maxCommentLength = appConfig?.contentLimits.commentContentMaxLength ?? 300;
    const reactionTypes = post ? (appConfig?.reactionTypesByEventType[post.eventType ?? activeEvent?.eventType ?? ''] ?? []) : [];

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!commentText.trim() || !post || !activeMember || !canComment) return;

        setCommentError(null);

        try {
            await createComment.mutateAsync({
                postId: post.id,
                authorMemberId: activeMember.id,
                content: commentText.trim(),
                parentCommentId: replyTarget?.parentCommentId,
            });
        } catch (error) {
            setCommentError(isModuleNotAvailableError(error) ? t('moduleUnavailable') : toErrorMessage(error, t('commentFailed')));
            return;
        }

        if (replyTarget) setAutoExpandThread({ threadId: replyTarget.parentCommentId, nonce: Date.now() });
        setCommentText('');
        setReplyTarget(null);
    }

    function handleReply(parentCommentId: string, authorName: string) {
        setCommentError(null);
        setReplyTarget({ parentCommentId, authorName });
    }

    function handleCancelReply() {
        setReplyTarget(null);
    }

    const commentsPanel = post && (
        <PostCommentsPanel
            post={post}
            comments={comments}
            hasMoreComments={hasMoreComments}
            isLoadingMoreComments={isLoadingMoreComments}
            onLoadMoreComments={fetchMoreComments}
            membersById={membersById}
            timeAgo={timeAgo}
            commentText={commentText}
            onCommentTextChange={setCommentText}
            commentError={!isEventWritable(activeEvent?.status) ? t('eventReadOnly') : commentError}
            onSubmit={handleSubmit}
            submitDisabled={!commentText.trim() || createComment.isPending || !canComment}
            inputDisabled={!canComment}
            maxCommentLength={maxCommentLength}
            reactionTypes={reactionTypes}
            replyTarget={replyTarget}
            onReply={handleReply}
            onCancelReply={handleCancelReply}
            autoExpandThread={autoExpandThread}
        />
    );

    return (
        <Modal
            open={isOpen}
            onClose={close}
            dismissOnBack={false}
            size="lg"
            closeLabel={t('close')}
            closeButtonPosition="right"
            className="min-h-[70vh]"
        >
            {/* Comments header */}
            <div className="z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-5 w-full shrink-0">
                <h2 className="text-base font-bold text-ink">{t('title')}</h2>
            </div>

            {isPending && <p className="text-center text-sm text-ink-muted py-16">{t('loading')}</p>}

            {error instanceof ApiError && error.status === 404 && (
                <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                    <p className="text-base font-semibold text-ink mb-1">{t('notFoundTitle')}</p>
                    <p className="text-sm text-ink-muted">{t('notFoundDescription')}</p>
                </div>
            )}

            {/* Comments */}
            {post && <section className="w-full min-w-0 min-h-0 flex-1 flex flex-col">{commentsPanel}</section>}
        </Modal>
    );
}
