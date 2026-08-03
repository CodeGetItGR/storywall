'use client';

import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import type { CommentResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { avatarColorFromId, initialsFromName, timeAgoParts } from '@/lib/utils';

interface CommentsListProps {
    comments: CommentResponseDto[];
    membersById: Map<string, EventMemberResponseDto>;
}

export function CommentsList({ comments, membersById }: CommentsListProps) {
    const t = useTranslations('PostModal');

    return (
        <div className="flex flex-col gap-4">
            {comments.map((comment) => {
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
                            className="shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="bg-surface-muted rounded-2xl rounded-tl-sm px-4 py-3">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-sm font-semibold text-ink leading-tight">{name}</span>
                                    <span className="text-xs text-ink-faint">
                                        {commentTimeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${commentTimeAgo.unit}`, { count: commentTimeAgo.value })}
                                    </span>
                                </div>
                                <p className="text-sm text-ink leading-relaxed">{comment.content}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
