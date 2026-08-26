'use client';

import { ArrowRight, Pin } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { PiMusicNotesPlusFill } from 'react-icons/pi';

import { CommentsList } from '@/components/feed/post/CommentsList';
import { useEventMembers, usePostComments } from '@/hooks';
import type { PostResponseDto } from '@/lib/api/types';
import { formatPlaylistDigestContent } from '@/lib/feed/playlistDigest';
import { routes } from '@/lib/routes';
import { timeAgoParts } from '@/lib/utils';

interface PlaylistDigestCardProps {
    post: PostResponseDto;
    showCommentLink?: boolean;
}

export function PlaylistDigestCard({ post }: PlaylistDigestCardProps) {
    const t = useTranslations('PostCard');
    const locale = useLocale();
    const timeAgo = useMemo(() => timeAgoParts(post.createdAt), [post.createdAt]);
    const createdAt = useMemo(() => new Date(post.createdAt), [post.createdAt]);
    const dateParts = useMemo(
        () => ({
            day: new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(createdAt),
            month: new Intl.DateTimeFormat(locale, { month: '2-digit' }).format(createdAt),
            time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(createdAt),
        }),
        [createdAt, locale]
    );
    const { data: commentPages } = usePostComments(post.id);
    const comments = useMemo(() => commentPages?.pages.flatMap((page) => page.content) ?? [], [commentPages?.pages]);
    const { data: members = [] } = useEventMembers(post.eventId);
    const visibleComments = useMemo(() => comments.slice(0, 3), [comments]);
    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

    return (
        <article className="bg-transparent p-1.5">
            {/* Playlist digest */}
            <div className="relative isolate overflow-hidden bg-linear-to-br from-[#9d3868] via-primary to-accent-orange px-4 py-4 text-white sm:px-5 rounded-xl">
                <div
                    className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/2 bg-white/10 [clip-path:polygon(24%_0,100%_0,100%_100%,0_100%)]"
                    aria-hidden="true"
                />
                <div
                    className="playlist-light-ray pointer-events-none absolute -top-20 z-20 h-[200%] w-48 rotate-24 bg-linear-to-r from-transparent via-[#fff2a8]/55 to-transparent blur-md mix-blend-screen"
                    aria-hidden="true"
                />
                <PiMusicNotesPlusFill
                    className="playlist-note-drift pointer-events-none absolute left-1/2 top-1/2 z-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 text-white/10 sm:h-36 sm:w-36"
                    aria-hidden="true"
                />

                {/* Meta */}
                <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="mt-1.5 mb-2.5 flex min-w-0 items-center gap-3 text-white">
                        <div className="flex items-end gap-1.5">
                            <div>
                                <p className="text-[0.625rem] font-semibold uppercase leading-none text-white/75">{t('date')}</p>
                                <p className="text-xl font-black leading-none tabular-nums">{dateParts.day}</p>
                            </div>
                            <span className="mb-0.5 h-7 w-px bg-white/80" aria-hidden="true" />
                            <div>
                                <p className="text-[0.625rem] font-semibold uppercase leading-none text-white/75">{t('month')}</p>
                                <p className="text-xl font-black leading-none tabular-nums">{dateParts.month}</p>
                            </div>
                            <span className="mb-0.5 h-7 w-px bg-white/80" aria-hidden="true" />
                            <div>
                                <p className="text-[0.625rem] font-semibold uppercase leading-none text-white/75">{t('time')}</p>
                                <p className="text-xl font-black leading-none tabular-nums">{dateParts.time}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        {post.isPinned && (
                            <span className="flex h-8 w-8 items-center justify-center text-white/90" aria-label={t('pinned')} title={t('pinned')}>
                                <Pin className="h-4 w-4" strokeWidth={1.8} />
                            </span>
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="relative z-10 mt-4 grid grid-cols-[1fr_5rem] items-center gap-4">
                    <div className="min-w-0">
                        <p className="text-[0.7rem] font-normal uppercase leading-none text-white/75">{t('playlistDigest')}</p>
                        <h2 className="mt-1.5 text-lg font-semibold leading-tight text-white">{formatPlaylistDigestContent(post.content, t)}</h2>
                        <p className="mt-1.5 text-xs text-white/75">
                            {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
                        </p>
                    </div>

                    <PiMusicNotesPlusFill
                        className="playlist-note-float h-20 w-20 justify-self-end text-white/90 drop-shadow-xl"
                        aria-hidden="true"
                    />
                </div>

                {/* Actions */}
                <div className="relative z-10 mt-4 flex items-center justify-end">
                    <Link
                        href={routes.tools.playlist}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/25"
                        aria-label={t('openPlaylist')}
                    >
                        <PiMusicNotesPlusFill className="h-4 w-4" aria-hidden="true" />
                        <span>{t('openPlaylist')}</span>
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    </Link>
                </div>
            </div>

            {visibleComments.length > 0 && (
                /* Comments */
                <div className="border-t border-border/50 px-4 pb-4 pt-3">
                    <CommentsList comments={visibleComments} membersById={membersById} compact limit={3} />
                </div>
            )}
        </article>
    );
}
