'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { PostCommentsPanel } from '@/components/feed/post';
import { Modal } from '@/components/ui/modal';
import { useEventMembers, usePost, usePostCommentThread, usePostModal } from '@/hooks';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ApiError } from '@/lib/api/client';
import { isEventWritable } from '@/lib/eventLifecycle';
import { timeAgoParts } from '@/lib/utils';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

export function PostModal() {
    const t = useTranslations('PostModal');
    const { postId, isOpen, close } = usePostModal();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const { data: post, error, isPending } = usePost(postId);
    const { data: members = [] } = useEventMembers(post?.eventId ?? null);
    const { data: appConfig } = useAppConfig();

    const canComment = Boolean(activeMember) && isEventWritable(activeEvent?.status);
    const {
        comments,
        hasMoreComments,
        isLoadingMoreComments,
        isFetchingComments,
        onLoadMoreComments,
        commentCountDelta,
        commentText,
        onCommentTextChange,
        commentError,
        setCommentError,
        onSubmit,
        submitDisabled,
        replyTarget,
        onReply,
        onCancelReply,
        autoExpandThread,
        lastPostedCommentId,
    } = usePostCommentThread(postId, post?.eventId ?? '', canComment);

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
    const maxCommentLength = appConfig?.contentLimits.commentContentMaxLength ?? 300;
    const reactionTypes = post ? (appConfig?.reactionTypesByEventType[post.eventType ?? activeEvent?.eventType ?? ''] ?? []) : [];

    function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        void onSubmit(e, activeMember?.id);
    }

    function handleClose() {
        setCommentError(null);
        close();
    }

    const commentsPanel = post && (
        <PostCommentsPanel
            post={post}
            commentCount={post.commentCount + commentCountDelta}
            comments={comments}
            hasMoreComments={Boolean(hasMoreComments)}
            isLoadingMoreComments={isLoadingMoreComments}
            isFetchingComments={isFetchingComments}
            onLoadMoreComments={onLoadMoreComments}
            membersById={membersById}
            timeAgo={timeAgo}
            commentText={commentText}
            onCommentTextChange={onCommentTextChange}
            commentError={!isEventWritable(activeEvent?.status) ? t('eventReadOnly') : commentError}
            onSubmit={handleSubmit}
            submitDisabled={submitDisabled}
            inputDisabled={!canComment}
            maxCommentLength={maxCommentLength}
            reactionTypes={reactionTypes}
            replyTarget={replyTarget}
            onReply={onReply}
            onCancelReply={onCancelReply}
            autoExpandThread={autoExpandThread}
            lastPostedCommentId={lastPostedCommentId}
        />
    );

    return (
        <Modal
            open={isOpen}
            onClose={handleClose}
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
