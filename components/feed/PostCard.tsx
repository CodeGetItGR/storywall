'use client';

import { MessageCircle, MoreHorizontal, Pin } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { PostAuthorAvatar, ReactionCount } from '@/components/feed/post';
import { CommentsList } from '@/components/feed/post/CommentsList';
import { useEventMembers, usePostComments, usePostLike, usePostModal } from '@/hooks';
import type { PostResponseDto } from '@/lib/api/types';
import { cn, timeAgoParts } from '@/lib/utils';
import { useActiveMember } from '@/providers/EventProvider';

interface PostCardProps {
    post: PostResponseDto;
    showCommentLink?: boolean;
    isLcpCandidate?: boolean;
}

export function PostCard({ post, showCommentLink = true, isLcpCandidate = false }: PostCardProps) {
    const t = useTranslations('PostCard');
    const { open: openPostModal } = usePostModal();
    const { liked, count: likeCount, toggle: handleLike, isPending: isLikePending } = usePostLike(post);

    const authorName = post.author?.displayName ?? t('unknownAuthor');
    const authorSubtitle = post.author?.nickname ?? post.author?.role;
    const timeAgo = useMemo(() => timeAgoParts(post.createdAt), [post.createdAt]);
    const media = post.media;
    const isHostPost = post.author?.role === 'HOST';
    const { data: comments = [] } = usePostComments(post.id);
    const { data: members = [] } = useEventMembers(post.eventId);

    const activeMember = useActiveMember();
    const isMyPost = activeMember?.id !== undefined && post.authorMemberId === activeMember.id;
    const visibleComments = useMemo(() => comments.slice(0, 3), [comments]);
    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

    function openPost() {
        openPostModal(post.id, { mediaIndex: 0, view: 'comments' });
    }

    function handleOpenSingleMedia() {
        openPostModal(post.id, { mediaIndex: 0 });
    }

    function handleMediaClick(event: React.MouseEvent<HTMLButtonElement>) {
        const index = Number(event.currentTarget.dataset.index ?? 0);
        openPostModal(post.id, { mediaIndex: index });
    }

    return (
        <div className={cn('relative', isHostPost && 'pt-3 pr-3')}>
            <div className="rounded-[1.75rem] bg-[linear-gradient(132deg,rgba(199,119,177,0.9)_15.05%,rgba(228,130,121,0.9)_33.58%,rgba(242,136,92,0.9)_42.44%,rgba(254,196,99,0.9)_78.7%)] p-[1.5px] shadow-[0_14px_36px_rgba(242,136,92,0.16)]">
                <article className="overflow-hidden rounded-[1.65rem] bg-card">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-3">
                        <PostAuthorAvatar avatarUrl={post.author?.avatarUrl} name={authorName} subtitle={authorSubtitle} timeAgo={timeAgo} />
                        <div className="flex items-center gap-1">
                            {post.isPinned && (
                                <span
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary"
                                    aria-label={t('pinned')}
                                    title={t('pinned')}
                                >
                                    <Pin className="w-4 h-4" strokeWidth={1.8} />
                                </span>
                            )}
                            {isHostPost && (
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none rounded-full bg-gradient-brand px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_10px_20px_rgba(255,122,89,0.24)]"
                                >
                                    {t('hostPost')}
                                </span>
                            )}
                            {isMyPost && (
                                <button
                                    aria-label={t('moreOptions')}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-muted"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    {post.content && (
                        <div className="px-4 pb-3">
                            <p className="text-sm leading-relaxed text-ink">{post.content}</p>
                        </div>
                    )}

                    {/* Media */}
                    {media.length === 1 && (
                        <button
                            type="button"
                            onClick={handleOpenSingleMedia}
                            aria-label={t('viewPhoto', { name: authorName })}
                            className="relative block aspect-4/3 w-full overflow-hidden bg-surface-muted"
                        >
                            <Image
                                src={media[0].mediaUrl}
                                alt={t('photoBy', { name: authorName })}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 680px"
                                loading={isLcpCandidate ? 'eager' : 'lazy'}
                            />
                        </button>
                    )}
                    {media.length > 1 && (
                        <div className="grid grid-cols-2 gap-0.5 bg-surface-muted">
                            {media.slice(0, 4).map((item, i) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    onClick={handleMediaClick}
                                    data-index={i}
                                    aria-label={t('viewPhotoAt', { index: i + 1, count: media.length, name: authorName })}
                                    className="relative block aspect-square overflow-hidden"
                                >
                                    <Image
                                        src={item.mediaUrl}
                                        alt={t('photoBy', { name: authorName })}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 50vw, 340px"
                                        loading={isLcpCandidate && i === 0 ? 'eager' : 'lazy'}
                                    />
                                    {i === 3 && media.length > 4 && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-ink/50 text-lg font-semibold text-white">
                                            +{media.length - 4}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-1">
                            {/* Like */}
                            <button
                                onClick={handleLike}
                                disabled={isLikePending}
                                aria-label={liked ? t('unlikePost') : t('likePost')}
                                aria-pressed={liked}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                                    liked ? 'bg-primary-light text-primary' : 'text-ink-muted hover:bg-surface-muted'
                                )}
                            >
                                <ReactionCount
                                    count={likeCount}
                                    iconClassName={liked ? 'fill-primary text-primary' : ''}
                                    iconStrokeWidth={liked ? 0 : 1.8}
                                />
                            </button>

                            {/* Comment */}
                            {showCommentLink ? (
                                <button
                                    type="button"
                                    onClick={openPost}
                                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted"
                                    aria-label={t('comments', { count: post.commentCount })}
                                >
                                    <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                                    <span className="tabular-nums">{post.commentCount}</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted"
                                    aria-label={t('comments', { count: post.commentCount })}
                                >
                                    <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                                    <span className="tabular-nums">{post.commentCount}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {visibleComments.length > 0 && (
                        <div className="border-t border-border/50 px-4 pb-4 pt-2">
                            <CommentsList comments={visibleComments} membersById={membersById} compact limit={3} />
                        </div>
                    )}
                </article>
            </div>
        </div>
    );
}
