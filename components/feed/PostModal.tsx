'use client';

import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { PostAuthorAvatar, PostMediaCarousel, ReactionCount } from '@/components/feed/post';
import { CommentCount } from '@/components/feed/post/CommentCount';
import Avatar from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { useCreateComment, useEventMembers, usePost, usePostComments, usePostModal } from '@/hooks';
import { ApiError } from '@/lib/api/client';
import { avatarColorFromId, cn, initialsFromName, timeAgoParts } from '@/lib/utils';
import { useActiveMember } from '@/providers/EventProvider';

export function PostModal() {
    const t = useTranslations('PostModal');
    const tCard = useTranslations('PostCard');
    const { postId, isOpen, close, mediaIndex, view, setMediaIndex } = usePostModal();
    const activeMember = useActiveMember();
    const { data: post, error, isPending } = usePost(postId);
    const { data: comments = [] } = usePostComments(postId);
    const { data: members = [] } = useEventMembers(post?.eventId ?? null);
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

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!commentText.trim() || !post || !activeMember) return;

        setCommentError(null);

        try {
            await createComment.mutateAsync({
                postId: post.id,
                authorMemberId: activeMember.id,
                content: commentText.trim(),
            });
        } catch {
            setCommentError(t('commentFailed'));
            return;
        }

        setCommentText('');
    }

    return (
        <Modal open={isOpen} onClose={close} size={hasMedia ? 'full' : 'lg'} closeLabel={t('close')} closeButtonPosition={'left'} className={hasMedia ? undefined : 'min-h-[70vh]'}>
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

            {post &&
                (() => {
                    const commentsPanel = (
                        <>
                            <section className="border-b flex justify-between pb-2 px-3 shrink-0 pt-2">
                                <PostAuthorAvatar
                                    avatarUrl={post.author?.avatarUrl}
                                    name={post.author?.displayName ?? tCard('unknownAuthor')}
                                    subtitle={post.author?.nickname ?? post.author?.role}
                                    timeAgo={timeAgo}
                                />
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
                                <h3 className="text-sm font-bold text-ink mb-4">
                                    {comments.length === 0 ? t('noCommentsYet') : t('commentCount', { count: comments.length })}
                                </h3>

                                <div className="flex flex-col gap-4">
                                    {comments.map((comment) => {
                                        const author = comment.authorMemberId ? membersById.get(comment.authorMemberId) : undefined;
                                        const name = author?.displayName ?? t('unknownAuthor');
                                        const commentTimeAgo = timeAgoParts(comment.createdAt);

                                        return (
                                            <div key={comment.id} className="flex gap-3">
                                                <Avatar
                                                    initials={initialsFromName(name)}
                                                    color={avatarColorFromId(comment.authorMemberId ?? comment.id)}
                                                    size="sm"
                                                    alt={name}
                                                    className="shrink-0 mt-0.5"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="bg-surface-muted rounded-2xl rounded-tl-sm px-4 py-3">
                                                        <div className="flex items-baseline gap-2 mb-1">
                                                            <span className="text-sm font-semibold text-ink leading-tight">{name}</span>
                                                            <span className="text-xs text-ink-faint">
                                                                {commentTimeAgo.unit === 'now'
                                                                    ? t('justNow')
                                                                    : t(`timeAgo.${commentTimeAgo.unit}`, {
                                                                          count: commentTimeAgo.value,
                                                                      })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-ink leading-relaxed">{comment.content}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Modal.Body>

                            <form
                                onSubmit={handleSubmit}
                                className="bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex flex-col items-center gap-3 shrink-0"
                            >
                                {commentError && <p className="text-xs text-destructive px-4">{commentError}</p>}
                                <section className="flex gap-3 w-full">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder={t('commentPlaceholder')}
                                        aria-label={t('commentTextAriaLabel')}
                                        className="relative flex-1 bg-surface-muted rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!commentText.trim() || createComment.isPending || !activeMember}
                                        aria-label={t('postComment')}
                                        className="text-primary disabled:text-ink-faint transition-colors"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </section>
                            </form>
                        </>
                    );

                    if (!hasMedia) {
                        return <section className="w-full min-w-0 min-h-0 flex-1 flex flex-col">{commentsPanel}</section>;
                    }

                    const clampedIndex = Math.min(Math.max(mediaIndex, 0), post.media.length - 1);

                    return (
                        <section className="relative w-full flex-1 min-h-0 lg:grid lg:grid-cols-5 overflow-hidden">
                            <div className="relative w-full h-full lg:col-span-3 bg-black">
                                <PostMediaCarousel
                                    key={postId}
                                    media={post.media}
                                    initialIndex={clampedIndex}
                                    onIndexChange={setMediaIndex}
                                    alt={tCard('photoBy', { name: post.author?.displayName ?? tCard('unknownAuthor') })}
                                />

                                <div
                                    className={cn(
                                        'lg:hidden absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent px-4 pt-12 pb-4 transition-opacity duration-200',
                                        commentsOpen && 'opacity-0 pointer-events-none'
                                    )}
                                >
                                    <button type="button" onClick={() => setCommentsOpen(true)} className="w-full text-left" aria-label={t('showComments')}>
                                        <p className="text-sm font-semibold text-white mb-1">{post.author?.displayName ?? tCard('unknownAuthor')}</p>
                                        {post.content && <p className="text-sm text-white/90 leading-snug line-clamp-2 mb-2">{post.content}</p>}
                                        <div className="flex items-center gap-4">
                                            <ReactionCount count={post.reactionCount} wrapperClassName="text-white/90" />
                                            <CommentCount count={post.commentCount} wrapperClassName="text-white/90" />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div
                                className={cn(
                                    'lg:col-span-2 lg:static lg:h-auto lg:max-h-none lg:rounded-none lg:translate-y-0 lg:visible lg:flex lg:flex-col lg:min-h-0 lg:bg-background lg:border-l lg:border-border',
                                    'fixed inset-x-0 bottom-0 z-10 h-[85dvh] max-h-[85dvh] bg-background rounded-t-2xl flex flex-col transition-[transform,visibility] duration-300 ease-out',
                                    commentsOpen ? 'translate-y-0 visible delay-0' : 'translate-y-full invisible delay-300'
                                )}
                            >
                                <div className="lg:hidden flex items-center justify-center pt-2.5 pb-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setCommentsOpen(false)}
                                        aria-label={t('hideComments')}
                                        className="w-10 h-1.5 rounded-full bg-border"
                                    />
                                </div>
                                {commentsPanel}
                            </div>
                        </section>
                    );
                })()}
        </Modal>
    );
}
