'use client';

import { LoaderCircle, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { useCallback } from 'react';

import Avatar from '@/components/ui/avatar';
import type { EventMemberResponseDto } from '@/lib/api/types';
import type { StoryGroup } from '@/lib/stories';
import { avatarColorFromId, cn, initialsFromName } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';

interface StoryAvatarProps {
    group: StoryGroup;
    member: EventMemberResponseDto;
    onOpenStoryAction: (storyId: string) => void;
    isCurrentUser?: boolean;
}

export function StoryAvatar({ group, member, onOpenStoryAction, isCurrentUser }: StoryAvatarProps) {
    const t = useTranslations('StoryAvatar');
    const { openStoryCapture, canComposeStory, isCreatingStory } = useComposer();
    const firstStoryId = group.stories[0].id;

    const handleOpenStory = useCallback(() => {
        onOpenStoryAction(firstStoryId);
    }, [firstStoryId, onOpenStoryAction]);

    const handleOpenComposeStory = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            openStoryCapture();
        },
        [openStoryCapture]
    );

    const ring = (
        <div
            className={cn('w-15.5 h-15.5 rounded-full p-0.75 flex items-center justify-center', group.allSeen ? 'bg-border' : 'bg-gradient-brand')}
            aria-hidden="true"
        >
            <div className="w-full h-full rounded-full p-0.5 bg-background flex items-center justify-center">
                <Avatar
                    initials={initialsFromName(member.displayName)}
                    color={avatarColorFromId(member.id)}
                    size="xl"
                    alt={member.displayName}
                    className="w-full h-full"
                />
            </div>
        </div>
    );

    const label = (
        <span className="text-[11px] text-ink-muted font-medium text-center leading-tight max-w-14 truncate">
            {isCurrentUser ? t('yourStory') : member.displayName.split(' ')[0]}
        </span>
    );

    if (isCurrentUser) {
        return (
            <div className="flex shrink-0 flex-col items-center gap-2">
                {/* Current user story */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={handleOpenStory}
                        disabled={isCreatingStory}
                        aria-label={t('yourStory')}
                        className="disabled:opacity-70"
                    >
                        {ring}
                        {isCreatingStory && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
                                <LoaderCircle className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
                            </span>
                        )}
                    </button>
                    {canComposeStory && (
                        <button
                            type="button"
                            onClick={handleOpenComposeStory}
                            disabled={isCreatingStory}
                            aria-label={t('addAnotherStory')}
                            className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-gradient-brand"
                        >
                            {isCreatingStory ? (
                                <LoaderCircle className="h-3 w-3 animate-spin text-white" aria-hidden="true" />
                            ) : (
                                <Plus className="h-3 w-3 text-white" strokeWidth={3} />
                            )}
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
            <button type="button" onClick={handleOpenStory} className="relative" aria-label={t('userStory', { name: member.displayName })}>
                {ring}
            </button>
            {label}
        </div>
    );
}
