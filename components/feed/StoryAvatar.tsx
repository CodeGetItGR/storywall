'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { useCallback } from 'react';

import Avatar from '@/components/ui/avatar';
import { useMemberAvatarUrl } from '@/hooks/useMemberAvatarUrl';
import type { AuthorDto } from '@/lib/api/types';
import type { StoryGroup } from '@/lib/stories';
import { avatarColorFromId, cn, initialsFromName } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';

interface StoryAvatarProps {
    group: StoryGroup;
    author: AuthorDto;
    onOpenStoryAction: (storyId: string) => void;
    isCurrentUser?: boolean;
}

export function StoryAvatar({ group, author, onOpenStoryAction, isCurrentUser }: StoryAvatarProps) {
    const t = useTranslations('StoryAvatar');
    const { openStoryCapture, canComposeStory } = useComposer();
    const memberAvatarUrl = useMemberAvatarUrl();
    const firstStoryId = group.stories[0].id;

    const handleOpenStory = useCallback(() => {
        onOpenStoryAction(firstStoryId);
    }, [firstStoryId, onOpenStoryAction]);

    const handleOpenComposeStory = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            openStoryCapture();
        },
        [openStoryCapture],
    );

    const ring = (
        <div
            className={cn('flex h-15.5 w-15.5 items-center justify-center rounded-full p-0.75', group.allSeen ? 'bg-border' : 'bg-gradient-brand')}
            aria-hidden="true"
        >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-background p-0.5">
                <Avatar
                    src={memberAvatarUrl(author.memberId, author.avatarUrl)}
                    initials={initialsFromName(author.displayName)}
                    color={avatarColorFromId(author.memberId)}
                    size="xl"
                    alt={author.displayName}
                    className="h-full w-full"
                />
            </div>
        </div>
    );

    const label = (
        <span className="max-w-14 truncate text-center text-[11px] leading-tight font-medium text-ink-muted">
            {isCurrentUser ? t('yourStory') : author.displayName.split(' ')[0]}
        </span>
    );

    if (isCurrentUser) {
        return (
            <div className="flex shrink-0 flex-col items-center gap-2">
                {/* Current user story */}
                <div className="relative">
                    <button type="button" onClick={handleOpenStory} aria-label={t('yourStory')}>
                        {ring}
                    </button>
                    {canComposeStory && (
                        <button
                            type="button"
                            onClick={handleOpenComposeStory}
                            aria-label={t('addAnotherStory')}
                            className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-gradient-brand"
                        >
                            <Plus className="h-3 w-3 text-white" strokeWidth={3} />
                        </button>
                    )}
                </div>
                {label}
            </div>
        );
    }

    return (
        <div className="flex shrink-0 flex-col items-center gap-2">
            {/* Member story */}
            <button type="button" onClick={handleOpenStory} className="relative" aria-label={t('userStory', { name: author.displayName })}>
                {ring}
            </button>
            {label}
        </div>
    );
}
