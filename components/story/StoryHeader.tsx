'use client';

import { MoreVertical, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import Avatar from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

interface StoryHeaderProps {
    authorName: string;
    authorId: string;
    timeStr: string;
    tone?: 'dark' | 'light';
    canManage: boolean;
    canDelete: boolean;
    showMenu: boolean;
    leadingVisual?: ReactNode;
    onToggleMenu: () => void;
    onClose: () => void;
    onDeleteRequest: () => void;
    showAvatar?: boolean;
}

export function StoryHeader({
    authorName,
    authorId,
    timeStr,
    tone = 'dark',
    canManage,
    canDelete,
    showMenu,
    leadingVisual,
    onToggleMenu,
    onClose,
    onDeleteRequest,
    showAvatar
}: StoryHeaderProps) {
    const t = useTranslations('StoryPage');
    const isLight = tone === 'light';

    return (
        <>
            <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
                <div className="flex items-center gap-2.5">
                    {showAvatar && (leadingVisual ?? (
                        <Avatar
                            initials={initialsFromName(authorName)}
                            color={avatarColorFromId(authorId)}
                            size="sm"
                            alt={authorName}
                            className={cn('border-2', isLight ? 'border-black/10' : 'border-white/60')}
                        />
                    ))}
                    <div>
                        <p className={cn('text-sm font-semibold leading-tight', isLight ? 'text-ink' : 'text-white')}>{authorName}</p>
                        <p className={cn('text-xs leading-tight', isLight ? 'text-ink-muted' : 'text-white/60')}>{timeStr}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canManage && (
                        <button
                            onClick={onToggleMenu}
                            aria-label={t('moreOptions')}
                            className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                                isLight ? 'bg-black/8 text-ink hover:bg-black/12' : 'bg-black/30 text-white hover:bg-black/50'
                            )}
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        aria-label={t('closeStory')}
                        className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                            isLight ? 'bg-black/8 text-ink hover:bg-black/12' : 'bg-black/30 text-white hover:bg-black/50'
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {canManage && showMenu && canDelete && (
                <div className="motion-popover-enter absolute top-16 right-4 z-30 overflow-hidden rounded-xl bg-background shadow-lg">
                    <button
                        onClick={onDeleteRequest}
                        className="motion-menu-item whitespace-nowrap px-4 py-2.5 text-sm text-destructive hover:bg-surface-muted disabled:opacity-50"
                    >
                        {t('deleteStory')}
                    </button>
                </div>
            )}
        </>
    );
}
