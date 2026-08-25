'use client';

import { MoreVertical, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import Avatar from '@/components/ui/avatar';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

interface StoryHeaderProps {
    authorName: string;
    authorId: string;
    timeStr: string;
    canManage: boolean;
    canDelete: boolean;
    showMenu: boolean;
    leadingVisual?: ReactNode;
    onToggleMenu: () => void;
    onClose: () => void;
    onDeleteRequest: () => void;
}

export function StoryHeader({
    authorName,
    authorId,
    timeStr,
    canManage,
    canDelete,
    showMenu,
    leadingVisual,
    onToggleMenu,
    onClose,
    onDeleteRequest,
}: StoryHeaderProps) {
    const t = useTranslations('StoryPage');

    return (
        <>
            <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
                <div className="flex items-center gap-2.5">
                    {leadingVisual ?? (
                        <Avatar
                            initials={initialsFromName(authorName)}
                            color={avatarColorFromId(authorId)}
                            size="sm"
                            alt={authorName}
                            className="border-2 border-white/60"
                        />
                    )}
                    <div>
                        <p className="text-white text-sm font-semibold leading-tight">{authorName}</p>
                        <p className="text-white/60 text-xs leading-tight">{timeStr}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canManage && (
                        <button
                            onClick={onToggleMenu}
                            aria-label={t('moreOptions')}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        aria-label={t('closeStory')}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
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
