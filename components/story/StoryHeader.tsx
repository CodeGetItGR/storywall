'use client';

import { MoreVertical, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import Avatar from '@/components/ui/avatar';
import { useMemberAvatarUrl } from '@/hooks/useMemberAvatarUrl';
import { cn } from '@/lib/utils';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

interface StoryHeaderProps {
    authorName: string;
    authorId: string;
    avatarUrl?: string | null;
    timeStr: string;
    tone?: 'dark' | 'light';
    canManage: boolean;
    canDelete: boolean;
    canReport: boolean;
    showMenu: boolean;
    leadingVisual?: ReactNode;
    roleChip?: ReactNode;
    onToggleMenu: () => void;
    onClose: () => void;
    onDeleteRequest: () => void;
    onReportRequest: () => void;
    showAvatar?: boolean;
}

export function StoryHeader({
    authorName,
    authorId,
    avatarUrl,
    timeStr,
    tone = 'dark',
    canManage,
    canDelete,
    canReport,
    showMenu,
    leadingVisual,
    roleChip,
    onToggleMenu,
    onClose,
    onDeleteRequest,
    onReportRequest,
    showAvatar,
}: StoryHeaderProps) {
    const t = useTranslations('StoryPage');
    const memberAvatarUrl = useMemberAvatarUrl();
    const isLight = tone === 'light';

    return (
        <>
            <div className="absolute top-6 right-0 left-0 z-20 flex items-center justify-between gap-2 px-4 pt-2">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    {showAvatar &&
                        (leadingVisual ?? (
                            <Avatar
                                src={memberAvatarUrl(authorId, avatarUrl)}
                                initials={initialsFromName(authorName)}
                                color={avatarColorFromId(authorId)}
                                size="sm"
                                alt={authorName}
                                className={cn('border-2', isLight ? 'border-black/10' : 'border-white/60')}
                            />
                        ))}
                    <div className="min-w-0">
                        <p className={cn('flex items-center gap-1.5 text-sm leading-tight font-semibold', isLight ? 'text-ink' : 'text-white')}>
                            <span className="truncate">{authorName}</span>
                            {roleChip}
                        </p>
                        <p className={cn('text-xs leading-tight', isLight ? 'text-ink-muted' : 'text-white/60')}>{timeStr}</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {(canManage || canReport) && (
                        <button
                            onClick={onToggleMenu}
                            aria-label={t('moreOptions')}
                            aria-expanded={showMenu}
                            className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                                isLight ? 'bg-black/8 text-ink hover:bg-black/12' : 'bg-black/30 text-white hover:bg-black/50',
                            )}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        aria-label={t('closeStory')}
                        className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                            isLight ? 'bg-black/8 text-ink hover:bg-black/12' : 'bg-black/30 text-white hover:bg-black/50',
                        )}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {showMenu && ((canManage && canDelete) || canReport) && (
                <div className="motion-popover-enter absolute top-16 right-4 z-30 flex flex-col overflow-hidden rounded-xl bg-background shadow-lg">
                    {canReport && (
                        <button
                            type="button"
                            onClick={onReportRequest}
                            className="motion-menu-item px-4 py-2.5 text-left text-sm whitespace-nowrap text-ink hover:bg-surface-muted disabled:opacity-50"
                        >
                            {t('reportStory')}
                        </button>
                    )}
                    {canManage && canDelete && (
                        <button
                            type="button"
                            onClick={onDeleteRequest}
                            className="motion-menu-item px-4 py-2.5 text-left text-sm whitespace-nowrap text-destructive hover:bg-surface-muted disabled:opacity-50"
                        >
                            {t('deleteStory')}
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
