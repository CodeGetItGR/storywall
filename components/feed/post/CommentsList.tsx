'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { CommentThreadItem } from '@/components/feed/post/CommentThreadItem';
import Avatar from '@/components/ui/avatar';
import type { CommentResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { authorNameFor, groupCommentsIntoThreads } from '@/lib/comments';
import { avatarColorFromId, initialsFromName, timeAgoParts } from '@/lib/utils';

interface CommentsListProps {
    comments: CommentResponseDto[];
    membersById: Map<string, EventMemberResponseDto>;
    compact?: boolean;
    limit?: number;
    onReply?: (parentCommentId: string, authorName: string, mention?: boolean) => void;
    // A new value (even for the same threadId) forces that thread's replies
    // open — used to reveal a reply the member just posted, which would
    // otherwise land behind a collapsed "View replies" toggle.
    autoExpandThread?: { threadId: string; nonce: number } | null;
}

export function CommentsList({ comments, membersById, compact = false, limit, onReply, autoExpandThread }: CommentsListProps) {
    const t = useTranslations('PostModal');
    const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set());
    const visibleComments = typeof limit === 'number' ? comments.slice(0, limit) : comments;

    // Reveal the thread a reply just landed in, without waiting for an effect
    // — adjusting state during render, per https://react.dev/learn/you-might-not-need-an-effect.
    const [handledAutoExpandThread, setHandledAutoExpandThread] = useState(autoExpandThread);
    if (autoExpandThread !== handledAutoExpandThread) {
        setHandledAutoExpandThread(autoExpandThread);
        if (autoExpandThread && !expandedThreadIds.has(autoExpandThread.threadId)) {
            setExpandedThreadIds(new Set(expandedThreadIds).add(autoExpandThread.threadId));
        }
    }

    function toggleThread(threadId: string) {
        setExpandedThreadIds((current) => {
            const next = new Set(current);
            if (next.has(threadId)) {
                next.delete(threadId);
            } else {
                next.add(threadId);
            }
            return next;
        });
    }

    if (compact) {
        return (
            <div className="flex flex-col gap-2">
                {visibleComments.map((comment) => {
                    const name = authorNameFor(comment, membersById, t('unknownAuthor'));
                    const commentTimeAgo = timeAgoParts(comment.createdAt);

                    return (
                        <div key={comment.id} className="flex gap-2">
                            <Avatar
                                initials={initialsFromName(name)}
                                color={avatarColorFromId(comment.authorMemberId ?? comment.id)}
                                size="xs"
                                alt={name}
                                className="mt-0.5 shrink-0"
                            />
                            <div className="min-w-0 flex-1 pt-0.5">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[12px] font-semibold leading-tight text-ink">{name}</span>
                                    <span className="text-[10px] text-ink-faint">
                                        {commentTimeAgo.unit === 'now'
                                            ? t('justNow')
                                            : t(`timeAgo.${commentTimeAgo.unit}`, { count: commentTimeAgo.value })}
                                    </span>
                                </div>
                                <p className="text-[12px] leading-snug text-ink">{comment.content}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    const threads = groupCommentsIntoThreads(visibleComments);

    return (
        <div className="flex flex-col gap-4">
            {threads.map((thread) => (
                <CommentThreadItem
                    key={thread.comment.id}
                    thread={thread}
                    membersById={membersById}
                    onReply={onReply}
                    isExpanded={expandedThreadIds.has(thread.comment.id)}
                    onToggleReplies={toggleThread}
                />
            ))}
        </div>
    );
}
