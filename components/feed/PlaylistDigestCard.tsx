'use client';

import { MessageCircle, Music4, Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { ReactionCount } from '@/components/feed/post';
import { CommentsList } from '@/components/feed/post/CommentsList';
import { useEventMembers, usePostComments, usePostLike, usePostModal } from '@/hooks';
import type { PostResponseDto } from '@/lib/api/types';
import { cn, timeAgoParts } from '@/lib/utils';

interface PlaylistDigestCardProps {
    post: PostResponseDto;
    showCommentLink?: boolean;
}

export function PlaylistDigestCard({ post, showCommentLink = true }: PlaylistDigestCardProps) {
    const t = useTranslations('PostCard');
    const { open: openPostModal } = usePostModal();
    const { liked, count: likeCount, toggle: handleLike, isPending: isLikePending } = usePostLike(post);
    const timeAgo = useMemo(() => timeAgoParts(post.createdAt), [post.createdAt]);
    const { data: comments = [] } = usePostComments(post.id);
    const { data: members = [] } = useEventMembers(post.eventId);
    const visibleComments = useMemo(() => comments.slice(0, 3), [comments]);
    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

    function openPost() {
        openPostModal(post.id, { mediaIndex: 0, view: 'comments' });
    }

    return (
        <article className="border-b border-border/60 bg-card">
            <div className="px-4 pt-4 pb-3">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-700">
                        <Music4 className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            {post.isPinned && (
                                <span className="flex h-8 w-8 items-center justify-center text-sky-700" aria-label={t('pinned')} title={t('pinned')}>
                                    <Pin className="w-4 h-4" strokeWidth={1.8} />
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-lg font-semibold leading-tight text-ink">{t('playlistDigest')}</p>
                        <p className="mt-1 text-xs text-ink-muted">
                            {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
                        </p>
                    </div>
                </div>
            </div>

            {post.content && (
                <div className="px-4 pb-4">
                    <p className="text-sm leading-relaxed text-ink">{post.content}</p>
                </div>
            )}

            <div className="flex items-center justify-between px-4 pb-4">
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleLike}
                        disabled={isLikePending}
                        aria-label={liked ? t('unlikePost') : t('likePost')}
                        aria-pressed={liked}
                        className={cn(
                            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                            liked ? 'bg-sky-100 text-sky-700' : 'text-ink-muted hover:bg-surface-muted'
                        )}
                    >
                        <ReactionCount
                            count={likeCount}
                            iconClassName={liked ? 'fill-sky-700 text-sky-700' : ''}
                            iconStrokeWidth={liked ? 0 : 1.8}
                        />
                    </button>

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
                <div className="border-t border-border/50 px-4 pb-4 pt-3">
                    <CommentsList comments={visibleComments} membersById={membersById} compact limit={3} />
                </div>
            )}
        </article>
    );
}
