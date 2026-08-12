'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import type { StoryGroup } from '@/lib/stories';
import { avatarColorFromId, cn, initialsFromName } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';

interface StoryAvatarProps {
    group: StoryGroup;
    member: EventMemberResponseDto;
    isCurrentUser?: boolean;
}

export function StoryAvatar({ group, member, isCurrentUser }: StoryAvatarProps) {
    const t = useTranslations('StoryAvatar');
    const { openStoryCapture, canComposeStory } = useComposer();
    const firstStoryId = group.stories[0].id;

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

    if (!isCurrentUser) {
        return (
            <Link
                href={routes.story(firstStoryId)}
                className="flex flex-col items-center gap-2 shrink-0 group"
                aria-label={t('userStory', { name: member.displayName })}
            >
                {ring}
                {label}
            </Link>
        );
    }

    return (
        <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative">
                <Link href={routes.story(firstStoryId)} aria-label={t('yourStory')}>
                    {ring}
                </Link>
                {canComposeStory && (
                    <button
                        type="button"
                        onClick={openStoryCapture}
                        aria-label={t('addAnotherStory')}
                        className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-gradient-brand border-2 border-background flex items-center justify-center"
                    >
                        <Plus className="w-3 h-3 text-white" strokeWidth={3} />
                    </button>
                )}
            </div>
            {label}
        </div>
    );
}
