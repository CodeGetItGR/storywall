'use client';

import { useTranslations } from 'next-intl';

import { CommentActionsMenu } from '@/components/feed/post/CommentActionsMenu';
import Avatar from '@/components/ui/avatar';
import { useMemberAvatarUrl } from '@/hooks/useMemberAvatarUrl';
import type { CommentResponseDto } from '@/lib/api/types';
import { authorNameFor } from '@/lib/comments';
import { avatarColorFromId, initialsFromName, timeAgoParts } from '@/lib/utils';

interface ReplyItemProps {
    reply: CommentResponseDto;
    parentCommentId: string;
    onReply?: (parentCommentId: string, authorName: string, mention?: boolean) => void;
}

export function ReplyItem({ reply, parentCommentId, onReply }: ReplyItemProps) {
    const t = useTranslations('PostModal');
    const memberAvatarUrl = useMemberAvatarUrl();
    const name = authorNameFor(reply, t('unknownAuthor'));
    const timeAgo = timeAgoParts(reply.createdAt);

    function handleReply() {
        // Replies are flattened to one level (see lib/comments.ts), so this
        // still targets the thread's top-level comment — but it's answering
        // THIS reply specifically, so ask the composer to mention its author.
        onReply?.(parentCommentId, name, true);
    }

    return (
        <div className="flex gap-2" data-comment-id={reply.id}>
            <Avatar
                src={memberAvatarUrl(reply.authorMemberId, reply.author?.avatarUrl)}
                initials={initialsFromName(name)}
                color={avatarColorFromId(reply.authorMemberId ?? reply.id)}
                size="xs"
                alt={name}
                className="mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
                <div className="rounded-2xl rounded-tl-sm bg-surface-muted px-3 py-2">
                    {/* Reply header */}
                    <div className="mb-0.5 flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 wrap-break-word text-xs font-semibold leading-tight text-ink">{name}</span>
                        <span className="shrink-0 whitespace-nowrap text-[10px] text-ink-faint">
                            {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
                        </span>
                    </div>
                    <p className="wrap-break-word text-xs leading-relaxed text-ink">{reply.content}</p>
                </div>
                {onReply && (
                    <div className={'flex items-center gap-2 mt-2'}>
                        <button
                            type="button"
                            onClick={handleReply}
                            className="mt-1 px-3 text-xs font-semibold text-ink-faint hover:text-ink transition-colors"
                        >
                            {t('reply')}
                        </button>
                        {/* Reply actions */}
                        <CommentActionsMenu comment={reply} wrapperClassName="mt-1 flex justify-end px-1" />
                    </div>
                )}
            </div>
        </div>
    );
}
