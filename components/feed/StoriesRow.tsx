'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import Avatar from '@/components/ui/avatar';
import { useEventSessions } from '@/hooks/useEventSessions';
import { useMemberAvatarUrl } from '@/hooks/useMemberAvatarUrl';
import { useActiveModuleCopy } from '@/hooks/useModuleCopy';
import { usePostingAsMember } from '@/hooks/usePostingAsMember';
import { useEventStories } from '@/hooks/useStories';
import { groupStoriesByAuthor } from '@/lib/stories';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';

import { ScheduleStoryAvatar } from './ScheduleStoryAvatar';
import { StoriesEmptyHint } from './StoriesEmptyHint';
import { StoryAvatar } from './StoryAvatar';

interface StoriesRowProps {
    eventId: string;
    onOpenStoryAction: (storyId: string) => void;
}

export function StoriesRow({ eventId, onOpenStoryAction }: StoriesRowProps) {
    const storiesName = useActiveModuleCopy('stories').name;
    const tAvatar = useTranslations('StoryAvatar');
    const tAlt = useTranslations('ImageAlt');
    // The "your story" slot follows who new stories are posted as (a demo persona, for an admin).
    const { member: activeMember } = usePostingAsMember();
    const memberAvatarUrl = useMemberAvatarUrl();
    const { data: stories = [], isLoading: isLoadingStories } = useEventStories(eventId);
    const { data: sessions = [], isLoading: isLoadingSessions } = useEventSessions(eventId);
    const { openStoryCapture, canComposeStory } = useComposer();

    const groups = useMemo(() => groupStoriesByAuthor(stories), [stories]);
    const ownGroup = activeMember ? groups.find((g) => g.authorMemberId === activeMember.id) : undefined;
    const ownAuthor = ownGroup?.stories[0].author;
    const otherGroups = groups.filter((g) => g.authorMemberId !== activeMember?.id);
    const hasScheduleStory = !isLoadingSessions && sessions.length > 0;
    const hasStartItems = Boolean(ownAuthor || canComposeStory || hasScheduleStory);
    const isEmpty = !isLoadingStories && !isLoadingSessions && groups.length === 0 && sessions.length === 0;

    return (
        <section aria-label={storiesName} className="no-scrollbar flex items-start gap-4 overflow-x-auto px-4 py-4">
            {/* Current user slot */}
            {ownGroup && activeMember && ownAuthor ? (
                <StoryAvatar group={ownGroup} author={ownAuthor} isCurrentUser onOpenStoryAction={onOpenStoryAction} />
            ) : canComposeStory ? (
                <div className="flex shrink-0 flex-col items-center gap-2">
                    <button
                        type="button"
                        onClick={openStoryCapture}
                        disabled={!activeMember}
                        aria-label={tAvatar('addYourStory')}
                        className="relative flex h-15.5 w-15.5 items-center justify-center disabled:opacity-60"
                    >
                        <Avatar
                            src={memberAvatarUrl(activeMember?.id, activeMember?.avatarUrl)}
                            initials={initialsFromName(activeMember?.displayName ?? '?')}
                            color={avatarColorFromId(activeMember?.id ?? 'current-member')}
                            size="xl"
                            alt={activeMember?.displayName ?? tAlt('profilePhoto')}
                        />
                        <span className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-white">
                            <Plus className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                        </span>
                    </button>
                    <span className="max-w-14 truncate text-center text-[11px] leading-tight font-medium text-ink-muted">{tAvatar('yourStory')}</span>
                </div>
            ) : null}

            {hasStartItems && <div className="h-14 w-px shrink-0 self-center bg-border" aria-hidden="true" />}

            {/* Schedule story */}
            {hasScheduleStory && <ScheduleStoryAvatar />}

            {/* Other stories */}
            {otherGroups.map((group) => {
                const author = group.stories[0].author;
                if (!author) return null;
                return <StoryAvatar key={group.authorMemberId} group={group} author={author} onOpenStoryAction={onOpenStoryAction} />;
            })}

            {/* Empty */}
            {isEmpty && <StoriesEmptyHint storiesName={storiesName} canCompose={canComposeStory} />}
        </section>
    );
}
