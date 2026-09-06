'use client';

import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { PostAuthorAvatar } from '@/components/feed/post/PostAuthorAvatar';
import { PostReactionPicker } from '@/components/feed/post/PostReactionPicker';
import { ReactionSummary } from '@/components/feed/post/ReactionSummary';
import { useAppConfig, usePostModal } from '@/hooks';
import type { PostResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { cn, timeAgoParts } from '@/lib/utils';
import { useActiveEvent } from '@/providers/EventProvider';

interface PostMediaViewerInfoProps {
    post: PostResponseDto;
}

// Expandable caption: clamped to 3 lines, tapping the text toggles it open
// (scrolling if it's still too long) and closed again.
function PostMediaCaption({ content }: { content: string }) {
    const [expanded, setExpanded] = useState(false);

    function toggleExpanded() {
        setExpanded((value) => !value);
    }

    return (
        <button type="button" onClick={toggleExpanded} aria-expanded={expanded} className="mt-2 block w-full text-left">
            <p className={cn('whitespace-pre-wrap text-sm leading-relaxed text-white', expanded ? 'max-h-40 overflow-y-auto' : 'line-clamp-3')}>
                {content}
            </p>
        </button>
    );
}

export function PostMediaViewerInfo({ post }: PostMediaViewerInfoProps) {
    const t = useTranslations('PostCard');
    const { open: openPostModal } = usePostModal();
    const activeEvent = useActiveEvent();
    const { data: appConfig } = useAppConfig();

    const authorName = post.author?.displayName ?? t('unknownAuthor');
    const timeAgo = useMemo(() => timeAgoParts(post.createdAt), [post.createdAt]);
    const canWrite = isEventWritable(activeEvent?.status);
    const reactionTypes = appConfig?.reactionTypesByEventType[post.eventType ?? activeEvent?.eventType ?? ''] ?? [];

    function openComments() {
        openPostModal(post.id);
    }

    return (
        <div className="media-viewer-overlay w-full bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-4 pt-10">
            {/* Author */}
            <PostAuthorAvatar avatarUrl={post.author?.avatarUrl} name={authorName} timeAgo={timeAgo} />

            {/* Caption */}
            {post.content && <PostMediaCaption content={post.content} />}

            {/* Engagement actions */}
            <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <PostReactionPicker post={post} disabled={!canWrite} />
                    <button
                        type="button"
                        onClick={openComments}
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
                        onClick={openComments}
                        className="flex min-h-10 items-center rounded-full px-1.5 py-2 transition-[opacity,scale] hover:opacity-80 active:scale-[0.97]"
                        aria-label={t('openReactions')}
                    >
                        <ReactionSummary counts={post.reactionCounts} reactionTypes={reactionTypes} />
                    </button>
                )}
            </div>
        </div>
    );
}
