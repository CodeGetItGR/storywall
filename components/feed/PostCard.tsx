'use client';

import { MessageCircle, MoreHorizontal, Pin } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { PostAuthorAvatar, ReactionCount } from '@/components/feed/post';
import { usePostLike, usePostModal } from '@/hooks';
import type { PostResponseDto } from '@/lib/api/types';
import { cn, timeAgoParts } from '@/lib/utils';

interface PostCardProps {
    post: PostResponseDto;
    showCommentLink?: boolean;
}

export function PostCard({ post, showCommentLink = true }: PostCardProps) {
    const t = useTranslations('PostCard');
    const { open: openPostModal } = usePostModal();
    const { liked, count: likeCount, toggle: handleLike, isPending: isLikePending } = usePostLike(post);

    const authorName = post.author?.displayName ?? t('unknownAuthor');
    const authorSubtitle = post.author?.nickname ?? post.author?.role;
    const timeAgo = useMemo(() => timeAgoParts(post.createdAt), [post.createdAt]);
    const media = post.media;

    function openPost() {
        openPostModal(post.id, { mediaIndex: 0, view: 'comments' });
    }

    return (
        <article className="bg-card rounded-2xl shadow-[0_2px_16px_0_rgba(36,31,26,0.07)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <PostAuthorAvatar avatarUrl={post.author?.avatarUrl} name={authorName} subtitle={authorSubtitle} timeAgo={timeAgo} />
                <div className="flex items-center gap-1">
                    {post.isPinned && (
                        <span
                            className="w-8 h-8 flex items-center justify-center rounded-full text-primary"
                            aria-label={t('pinned')}
                            title={t('pinned')}
                        >
                            <Pin className="w-4 h-4" strokeWidth={1.8} />
                        </span>
                    )}
                    <button
                        aria-label={t('moreOptions')}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-faint transition-colors"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {post.content && (
                <div className="px-4 pb-3">
                    <p className="text-sm text-ink leading-relaxed">{post.content}</p>
                </div>
            )}

            {/* Media */}
            {media.length === 1 && (
                <button
                    type="button"
                    onClick={() => openPostModal(post.id, { mediaIndex: 0 })}
                    aria-label={t('viewPhoto', { name: authorName })}
                    className="relative block w-full aspect-4/3 bg-surface-muted overflow-hidden"
                >
                    <Image
                        src={media[0].mediaUrl}
                        alt={t('photoBy', { name: authorName })}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 680px"
                    />
                </button>
            )}
            {media.length > 1 && (
                <div className="grid grid-cols-2 gap-0.5 bg-surface-muted">
                    {media.slice(0, 4).map((item, i) => (
                        <button
                            type="button"
                            key={item.id}
                            onClick={() => openPostModal(post.id, { mediaIndex: i })}
                            aria-label={t('viewPhoto', { name: authorName })}
                            className="relative block aspect-square overflow-hidden"
                        >
                            <Image
                                src={item.mediaUrl}
                                alt={t('photoBy', { name: authorName })}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, 340px"
                            />
                            {i === 3 && media.length > 4 && (
                                <div className="absolute inset-0 bg-ink/50 flex items-center justify-center text-white text-lg font-semibold">
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
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                            liked ? 'text-primary bg-primary-light' : 'text-ink-muted hover:bg-surface-muted'
                        )}
                    >
                        <ReactionCount count={likeCount} iconClassName={liked ? 'fill-primary text-primary' : ''} iconStrokeWidth={liked ? 0 : 1.8} />
                    </button>

                    {/* Comment */}
                    {showCommentLink ? (
                        <button
                            type="button"
                            onClick={openPost}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors"
                            aria-label={t('comments', { count: post.commentCount })}
                        >
                            <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                            <span className="tabular-nums">{post.commentCount}</span>
                        </button>
                    ) : (
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors"
                            aria-label={t('comments', { count: post.commentCount })}
                        >
                            <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                            <span className="tabular-nums">{post.commentCount}</span>
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
