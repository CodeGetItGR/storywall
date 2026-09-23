'use client';

import { useTranslations } from 'next-intl';

import { CommentActionsMenu } from '@/components/feed/post/CommentActionsMenu';
import { ReplyItem } from '@/components/feed/post/ReplyItem';
import Avatar from '@/components/ui/avatar';
import { useMemberAvatarUrl } from '@/hooks/useMemberAvatarUrl';
import { authorNameFor, type CommentThread } from '@/lib/comments';
import { avatarColorFromId, initialsFromName, timeAgoParts } from '@/lib/utils';

interface CommentThreadItemProps {
    thread: CommentThread;
    onReply?: (parentCommentId: string, authorName: string, mention?: boolean) => void;
    isExpanded: boolean;
    onToggleReplies: (threadId: string) => void;
}

export function CommentThreadItem({ thread, onReply, isExpanded, onToggleReplies }: CommentThreadItemProps) {
    const t = useTranslations('PostModal');
    const { comment, replies } = thread;
    const memberAvatarUrl = useMemberAvatarUrl();
    const name = authorNameFor(comment, t('unknownAuthor'));
    const commentTimeAgo = timeAgoParts(comment.createdAt);

    function handleReply() {
        onReply?.(comment.id, name);
    }

    function handleToggleReplies() {
        onToggleReplies(comment.id);
    }

    return (
        <div className="flex flex-col gap-2" data-comment-id={comment.id}>
            <div className="flex gap-3">
                <Avatar
                    src={memberAvatarUrl(comment.authorMemberId, comment.author?.avatarUrl)}
                    initials={initialsFromName(name)}
                    color={avatarColorFromId(comment.authorMemberId ?? comment.id)}
                    size="sm"
                    alt={name}
                    className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                    <div className="rounded-2xl rounded-tl-sm bg-surface-muted px-4 py-3">
                        {/* Comment header */}
                        <div className="mb-1 flex items-baseline gap-2">
                            <span className="min-w-0 flex-1 text-sm leading-tight font-semibold wrap-break-word text-ink">{name}</span>
                            <span className="shrink-0 text-xs whitespace-nowrap text-ink-faint">
                                {commentTimeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${commentTimeAgo.unit}`, { count: commentTimeAgo.value })}
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-ink">{comment.content}</p>
                    </div>

                    {onReply && (
                        <div className="mt-1 flex items-center gap-3 px-4">
                            <button
                                type="button"
                                onClick={handleReply}
                                className="text-xs font-semibold text-ink-faint transition-colors hover:text-ink"
                            >
                                {t('reply')}
                            </button>
                            {/* Keep the toggle visible while expanded even if replies.length
                                is momentarily 0 (e.g. the only reply was just deleted) — an
                                expanded section must always offer a way to collapse it. */}
                            {(replies.length > 0 || isExpanded) && (
                                <button
                                    type="button"
                                    onClick={handleToggleReplies}
                                    className="text-xs font-semibold text-ink-faint transition-colors hover:text-ink"
                                >
                                    {isExpanded ? t('hideReplies') : t('viewReplies', { count: replies.length })}
                                </button>
                            )}
                            {/* Comment actions */}
                            <CommentActionsMenu comment={comment} wrapperClassName="mt-1 flex justify-end px-1" />
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="ml-9 flex flex-col gap-2 border-l border-border pl-3">
                    {replies.map((reply) => (
                        <ReplyItem key={reply.id} reply={reply} parentCommentId={comment.id} onReply={onReply} />
                    ))}
                </div>
            )}
        </div>
    );
}
