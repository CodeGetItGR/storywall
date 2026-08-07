'use client';

import { ArrowRight, Music4, Pin } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { CommentsList } from '@/components/feed/post/CommentsList';
import { useEventMembers, usePostComments } from '@/hooks';
import type { PostResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { timeAgoParts } from '@/lib/utils';

interface PlaylistDigestCardProps {
    post: PostResponseDto;
    showCommentLink?: boolean;
}

export function PlaylistDigestCard({ post }: PlaylistDigestCardProps) {
    const t = useTranslations('PostCard');
    const timeAgo = useMemo(() => timeAgoParts(post.createdAt), [post.createdAt]);
    const { data: comments = [] } = usePostComments(post.id);
    const { data: members = [] } = useEventMembers(post.eventId);
    const visibleComments = useMemo(() => comments.slice(0, 3), [comments]);
    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

    return (
        <article className="border-2 border-b border-border/60 bg-card/60">
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

            <div className="flex items-center justify-end gap-3 px-4 pb-4">
                <Link
                    href={routes.tools.playlist}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-primary-light hover:text-primary-dark"
                    aria-label={t('openPlaylist')}
                >
                    <Music4 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    <span>{t('openPlaylist')}</span>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </Link>
            </div>

            {visibleComments.length > 0 && (
                <div className="border-t border-border/50 px-4 pb-4 pt-3">
                    <CommentsList comments={visibleComments} membersById={membersById} compact limit={3} />
                </div>
            )}
        </article>
    );
}
