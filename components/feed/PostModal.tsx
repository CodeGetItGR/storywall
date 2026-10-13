'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { PostCommentsPanel } from '@/components/feed/post/PostCommentsPanel';
import { PostModalStatus } from '@/components/feed/post/PostModalStatus';
import { Modal } from '@/components/ui/modal';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { usePostCommentThread } from '@/hooks/usePostCommentThread';
import { usePostModal } from '@/hooks/usePostModal';
import { usePostModalPost } from '@/hooks/usePostModalPost';
import { isEventWritable } from '@/lib/eventLifecycle';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

export function PostModal() {
    const t = useTranslations('PostModal');
    const { postId, isOpen, close } = usePostModal();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const postsReadable = useModuleReadable(activeEvent?.id ?? null, 'posts');
    const { post, isLoading, isNotFound, isLoadFailed, retry } = usePostModalPost(postsReadable ? postId : null);
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
            open={isOpen && postsReadable}
            onClose={handleClose}
            dismissOnBack={false}
            size="lg"
            closeLabel={t('close')}
            closeButtonPosition="right"
            className="min-h-[70vh]"
        >
            {/* Loading */}
            {isLoading && <p className="py-16 text-center text-sm text-ink-muted">{t('loading')}</p>}

            {/* Not found */}
            {isNotFound && <PostModalStatus title={t('notFoundTitle')} description={t('notFoundDescription')} />}

            {/* Load failed */}
            {isLoadFailed && <PostModalStatus title={t('loadFailedTitle')} actionLabel={t('tryAgain')} onAction={retry} />}

            {/* Comments */}
            {post && <section className="mt-5 flex min-h-0 w-full min-w-0 flex-1 flex-col">{commentsPanel}</section>}
        </Modal>
    );
}
