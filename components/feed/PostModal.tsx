'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { PostCommentsPanel, PostMediaColumn } from '@/components/feed/post';
import { Modal } from '@/components/ui/modal';
import { useCreateComment, useEventMembers, usePost, usePostComments, usePostModal } from '@/hooks';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ApiError } from '@/lib/api/client';
import { isModuleNotAvailableError } from '@/lib/api/errors';
import { isEventWritable } from '@/lib/eventLifecycle';
import { cn, timeAgoParts } from '@/lib/utils';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

export function PostModal() {
    const t = useTranslations('PostModal');
    const toErrorMessage = useApiErrorMessage();
    const { postId, isOpen, close, mediaIndex, view, setMediaIndex } = usePostModal();
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
    // Mobile-only "comments sheet" expanded state, reseeded from the `view`
    // URL param whenever a (possibly different) post is opened. PostModal is
    // a single always-mounted instance, so this can't be plain useState —
    // note that `postId` itself already flips to null on close (see
    // usePostModal.close), so tracking postId here also catches "reopen the
    // same post" transitions, not just "open a different post." Adjusting
    // state during render (not in an effect) avoids an extra render pass —
    // see https://react.dev/learn/you-might-not-need-an-effect.
    const [seenModalState, setSeenModalState] = useState({ postId, view });
    const [commentsOpen, setCommentsOpen] = useState(view === 'comments');

    if (postId !== seenModalState.postId || view !== seenModalState.view) {
        setSeenModalState({ postId, view });
        setCommentsOpen(view === 'comments');
    }

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
    const hasMedia = (post?.media.length ?? 0) > 0;
    const canComment = Boolean(activeMember) && isEventWritable(activeEvent?.status);
    const maxCommentLength = appConfig?.contentLimits.commentContentMaxLength ?? 300;

    function handleShowComments() {
        setCommentsOpen(true);
    }

    function handleHideComments() {
        setCommentsOpen(false);
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!commentText.trim() || !post || !activeMember || !canComment) return;

        setCommentError(null);

        try {
            await createComment.mutateAsync({
                postId: post.id,
                authorMemberId: activeMember.id,
                content: commentText.trim(),
            });
        } catch (error) {
            setCommentError(isModuleNotAvailableError(error) ? t('moduleUnavailable') : toErrorMessage(error, t('commentFailed')));
            return;
        }

        setCommentText('');
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
        />
    );

    const clampedIndex = post ? Math.min(Math.max(mediaIndex, 0), post.media.length - 1) : 0;

    return (
        <Modal
            open={isOpen}
            onClose={close}
            size={hasMedia ? 'full' : 'lg'}
            closeLabel={t('close')}
            closeButtonPosition={'left'}
            className={hasMedia ? undefined : 'min-h-[70vh]'}
        >
            {!hasMedia && (
                <div className="z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-5 w-full shrink-0">
                    <h2 className="text-base font-bold text-ink">{t('title')}</h2>
                </div>
            )}

            {isPending && <p className="text-center text-sm text-ink-muted py-16">{t('loading')}</p>}

            {error instanceof ApiError && error.status === 404 && (
                <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                    <p className="text-base font-semibold text-ink mb-1">{t('notFoundTitle')}</p>
                    <p className="text-sm text-ink-muted">{t('notFoundDescription')}</p>
                </div>
            )}

            {post && !hasMedia && <section className="w-full min-w-0 min-h-0 flex-1 flex flex-col">{commentsPanel}</section>}

            {post && hasMedia && (
                <section className="relative w-full flex-1 min-h-0 lg:grid lg:grid-cols-5 overflow-hidden">
                    <PostMediaColumn
                        postKey={postId ?? post.id}
                        post={post}
                        clampedIndex={clampedIndex}
                        onIndexChange={setMediaIndex}
                        commentsOpen={commentsOpen}
                        onShowComments={handleShowComments}
                    />

                    <div
                        className={cn(
                            'lg:col-span-2 lg:static lg:h-auto lg:max-h-none lg:rounded-none lg:translate-y-0 lg:visible lg:flex lg:flex-col lg:min-h-0 lg:bg-background lg:border-l lg:border-border',
                            'fixed inset-x-0 bottom-0 z-10 h-[85dvh] max-h-[85dvh] bg-background rounded-t-2xl flex flex-col transition-[transform,visibility] duration-[var(--motion-duration-slow)] ease-[var(--motion-ease-enter)]',
                            commentsOpen ? 'translate-y-0 visible delay-0' : 'translate-y-full invisible delay-500'
                        )}
                    >
                        <div className="lg:hidden flex items-center justify-center pt-2.5 pb-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={handleHideComments}
                                aria-label={t('hideComments')}
                                className="w-10 h-1.5 rounded-full bg-border"
                            />
                        </div>
                        {commentsPanel}
                    </div>
                </section>
            )}
        </Modal>
    );
}
