'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { PostCommentsPanel } from '@/components/feed/post';
import { Modal } from '@/components/ui/modal';
import { useEventMembers, usePost, usePostCommentThread, usePostModal } from '@/hooks';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ApiError } from '@/lib/api/client';
import { isEventWritable } from '@/lib/eventLifecycle';
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
            {isPending && <p className="text-center text-sm text-ink-muted py-16">{t('loading')}</p>}

            {error instanceof ApiError && error.status === 404 && (
                <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                    <p className="text-base font-semibold text-ink mb-1">{t('notFoundTitle')}</p>
                    <p className="text-sm text-ink-muted">{t('notFoundDescription')}</p>
                </div>
            )}

            {/* Comments */}
            {post && <section className="w-full min-w-0 min-h-0 flex-1 flex flex-col mt-5">{commentsPanel}</section>}
        </Modal>
    );
}
