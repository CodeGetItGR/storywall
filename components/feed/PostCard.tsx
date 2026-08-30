'use client';

import { MessageCircle, MoreHorizontal, Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { MediaThumbnail } from '@/components/common/MediaThumbnail';
import { PostAuthorAvatar, PostMediaViewer, PostReactionPicker, ReactionSummary } from '@/components/feed/post';
import Badge from '@/components/ui/badge';
import { useAppConfig, usePostModal } from '@/hooks';
import type { PostResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { cn, timeAgoParts } from '@/lib/utils';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

interface PostCardProps {
    post: PostResponseDto;
    showCommentLink?: boolean;
    isLcpCandidate?: boolean;
}

export function PostCard({ post, showCommentLink = true, isLcpCandidate = false }: PostCardProps) {
    const t = useTranslations('PostCard');
    const { open: openPostModal } = usePostModal();
    const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

    const authorName = post.author?.displayName ?? t('unknownAuthor');
    const timeAgo = useMemo(() => timeAgoParts(post.createdAt), [post.createdAt]);
    const media = post.media;
    const isHostPost = post.author?.role === 'HOST';

    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const { data: appConfig } = useAppConfig();
    const isHost = useIsHost();
    const canWrite = isEventWritable(activeEvent?.status);
    const isMyPost = activeMember?.id !== undefined && post.authorMemberId === activeMember.id;
    const showHostPostBadge = isHostPost && !isHost;
    const reactionTypes = appConfig?.reactionTypesByEventType[post.eventType ?? activeEvent?.eventType ?? ''] ?? [];

    function openPost() {
        openPostModal(post.id);
    }

    function handleOpenSingleMedia() {
        setSelectedMediaIndex(0);
    }

    function handleMediaClick(event: React.MouseEvent<HTMLButtonElement>) {
        const index = Number(event.currentTarget.dataset.index ?? 0);
        setSelectedMediaIndex(index);
    }

    function preventMediaContextMenu(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
    }

    function closeMediaViewer() {
        setSelectedMediaIndex(null);
    }

    return (
        <article className={cn('relative border-b border-border/60 bg-card/60', showHostPostBadge && 'pt-3 sm:pt-0 sm:pr-3')}>
            <div className="flex items-center justify-between px-2 pt-4 pb-3">
                <PostAuthorAvatar avatarUrl={post.author?.avatarUrl} name={authorName} timeAgo={timeAgo} isHostPost={showHostPostBadge} />
                <div className="flex items-center gap-1">
                    {showHostPostBadge && <Badge variant="primary">{t('hostPost')}</Badge>}
                    {post.isPinned && (
                        <span className="flex h-8 w-8 items-center justify-center text-primary" aria-label={t('pinned')} title={t('pinned')}>
                            <Pin className="w-4 h-4" strokeWidth={1.8} />
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

            {post.content && (
                <div className="px-4 pb-3">
                    <p className="text-sm leading-relaxed text-ink">{post.content}</p>
                </div>
            )}

            {media.length === 1 && (
                <button
                    type="button"
                    onClick={handleOpenSingleMedia}
                    onContextMenu={preventMediaContextMenu}
                    aria-label={t('viewMedia', { name: authorName })}
                    className="relative block aspect-4/3 w-full overflow-hidden bg-surface-muted"
                >
                    <MediaThumbnail
                        src={media[0].mediaUrl}
                        mediaType={media[0].mediaType}
                        alt={t('mediaBy', { name: authorName })}
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
                            onContextMenu={preventMediaContextMenu}
                            data-index={i}
                            aria-label={t('viewMediaAt', { index: i + 1, count: media.length, name: authorName })}
                            className="relative block aspect-square overflow-hidden"
                        >
                            <MediaThumbnail
                                src={item.mediaUrl}
                                mediaType={item.mediaType}
                                alt={t('mediaBy', { name: authorName })}
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

            {/* Engagement actions */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                    <PostReactionPicker post={post} disabled={!canWrite} />
                    <button
                        type="button"
                        onClick={showCommentLink ? openPost : undefined}
                        className="flex min-h-10 items-center gap-1.5 rounded-full px-1.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                        aria-label={t('comments', { count: post.commentCount })}
                    >
                        <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
                        <span className="tabular-nums">{post.commentCount}</span>
                    </button>
                </div>
                {post.reactionCount > 0 && (
                    <button
                        type="button"
                        onClick={showCommentLink ? openPost : undefined}
                        className="flex min-h-10 items-center rounded-full px-1.5 py-2 transition-[opacity,scale] hover:opacity-80 active:scale-[0.97]"
                        aria-label={t('openReactions')}
                    >
                        <ReactionSummary counts={post.reactionCounts} reactionTypes={reactionTypes} />
                    </button>
                )}
            </div>

            {/* Fullscreen media viewer */}
            {selectedMediaIndex !== null && (
                <PostMediaViewer
                    media={media}
                    initialIndex={selectedMediaIndex}
                    alt={t('mediaBy', { name: authorName })}
                    onCloseAction={closeMediaViewer}
                />
            )}
        </article>
    );
}
