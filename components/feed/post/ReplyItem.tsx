'use client';

import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import type { CommentResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { authorNameFor } from '@/lib/comments';
import { avatarColorFromId, initialsFromName, timeAgoParts } from '@/lib/utils';

interface ReplyItemProps {
    reply: CommentResponseDto;
    membersById: Map<string, EventMemberResponseDto>;
    parentCommentId: string;
    onReply?: (parentCommentId: string, authorName: string) => void;
}

export function ReplyItem({ reply, membersById, parentCommentId, onReply }: ReplyItemProps) {
    const t = useTranslations('PostModal');
    const name = authorNameFor(reply, membersById, t('unknownAuthor'));
    const timeAgo = timeAgoParts(reply.createdAt);

    function handleReply() {
        onReply?.(parentCommentId, name);
    }

    return (
        <div className="flex gap-2">
            <Avatar
                initials={initialsFromName(name)}
                color={avatarColorFromId(reply.authorMemberId ?? reply.id)}
                size="xs"
                alt={name}
                className="mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
                <div className="rounded-2xl rounded-tl-sm bg-surface-muted px-3 py-2">
                    <div className="mb-0.5 flex items-baseline gap-2">
                        <span className="text-xs font-semibold leading-tight text-ink">{name}</span>
                        <span className="text-[10px] text-ink-faint">
                            {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
                        </span>
                    </div>
                    <p className="text-xs leading-relaxed text-ink">{reply.content}</p>
                </div>
                {onReply && (
                    <button type="button" onClick={handleReply} className="mt-1 px-3 text-xs font-semibold text-ink-faint hover:text-ink transition-colors">
                        {t('reply')}
                    </button>
                )}
            </div>
        </div>
    );
}
