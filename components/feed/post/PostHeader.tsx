'use client';

import { Music4 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PostAuthorAvatar } from '@/components/feed/post/PostAuthorAvatar';
import type { PostResponseDto } from '@/lib/api/types';

import { isPlaylistDigestPost } from './postUtils';

interface PostHeaderProps {
    post: PostResponseDto;
    timeAgo: { unit: 'now' | 'minutes' | 'hours' | 'days'; value: number };
}

export function PostHeader({ post, timeAgo }: PostHeaderProps) {
    const t = useTranslations('PostCard');

    if (isPlaylistDigestPost(post)) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10">
                    <Music4 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold leading-tight text-ink">{t('playlistDigest')}</p>
                    </div>
                    <span className="text-xs text-ink-muted">
                        {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
                    </span>
                </div>
            </div>
        );
    }

    const authorName = post.author?.displayName ?? t('unknownAuthor');
    const authorSubtitle = post.author?.nickname ?? post.author?.role;

    return <PostAuthorAvatar avatarUrl={post.author?.avatarUrl} name={authorName} subtitle={authorSubtitle} timeAgo={timeAgo} />;
}
