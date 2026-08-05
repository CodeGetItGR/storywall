'use client';

import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import type { CommentResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { avatarColorFromId, initialsFromName, timeAgoParts } from '@/lib/utils';

interface CommentsListProps {
    comments: CommentResponseDto[];
    membersById: Map<string, EventMemberResponseDto>;
    compact?: boolean;
    limit?: number;
}

export function CommentsList({ comments, membersById, compact = false, limit }: CommentsListProps) {
    const t = useTranslations('PostModal');
    const visibleComments = typeof limit === 'number' ? comments.slice(0, limit) : comments;

    if (compact) {
        return (
            <div className="flex flex-col gap-2">
                {visibleComments.map((comment) => {
                    const author = comment.authorMemberId ? membersById.get(comment.authorMemberId) : undefined;
                    const name = author?.displayName ?? t('unknownAuthor');
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
                                        {commentTimeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${commentTimeAgo.unit}`, { count: commentTimeAgo.value })}
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

    return (
        <div className="flex flex-col gap-4">
            {visibleComments.map((comment) => {
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
                            className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="rounded-2xl rounded-tl-sm bg-surface-muted px-4 py-3">
                                <div className="mb-1 flex items-baseline gap-2">
                                    <span className="text-sm font-semibold leading-tight text-ink">{name}</span>
                                    <span className="text-xs text-ink-faint">
                                        {commentTimeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${commentTimeAgo.unit}`, { count: commentTimeAgo.value })}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed text-ink">{comment.content}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
