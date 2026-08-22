'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useEventMembers, useEventStories } from '@/hooks';
import { useEventSessions } from '@/hooks/useEventSessions';
import { groupStoriesByAuthor } from '@/lib/stories';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveMember } from '@/providers/EventProvider';

import { ScheduleStoryAvatar } from './ScheduleStoryAvatar';
import { StoryAvatar } from './StoryAvatar';

interface StoriesRowProps {
    eventId: string;
}

export function StoriesRow({ eventId }: StoriesRowProps) {
    const t = useTranslations('StoriesRow');
    const tAvatar = useTranslations('StoryAvatar');
    const activeMember = useActiveMember();
    const { data: stories = [] } = useEventStories(eventId);
    const { data: members = [] } = useEventMembers(eventId);
    const { data: sessions = [], isLoading: isLoadingSessions } = useEventSessions(eventId);
    const { openStoryCapture, isCreatingStory, storyError, canComposeStory } = useComposer();

    const groups = useMemo(() => groupStoriesByAuthor(stories), [stories]);
    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

    const ownGroup = activeMember ? groups.find((g) => g.authorMemberId === activeMember.id) : undefined;
    const otherGroups = groups.filter((g) => g.authorMemberId !== activeMember?.id);
    const hasScheduleStory = !isLoadingSessions && sessions.length > 0;
    const hasStartItems = Boolean(ownGroup || canComposeStory || hasScheduleStory);

    return (
        <section aria-label={t('ariaLabel')} className="flex items-start gap-4 overflow-x-auto no-scrollbar px-4 py-4">
            {/* Current user slot */}
            {ownGroup && activeMember ? (
                <StoryAvatar group={ownGroup} member={activeMember} isCurrentUser />
            ) : canComposeStory ? (
                <div className="flex flex-col items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={openStoryCapture}
                        disabled={!activeMember || isCreatingStory}
                        aria-label={tAvatar('addYourStory')}
                        className="relative w-15.5 h-15.5 flex items-center justify-center disabled:opacity-60"
                    >
                        <Image src="/assets/StoryAvatar.svg" alt="" className="w-full h-full object-cover rounded-xl" width={150} height={150} />
                    </button>
                    <span className="text-[11px] text-ink-muted font-medium text-center leading-tight max-w-14 truncate">{tAvatar('yourStory')}</span>
                </div>
            ) : null}

            {hasStartItems && (
                <>
                    {storyError && (
                        <p role="alert" className="text-xs text-destructive shrink-0 self-center max-w-32">
                            {storyError}
                        </p>
                    )}

                    <div className="w-px h-14 bg-border self-center shrink-0" aria-hidden="true" />
                </>
            )}

            {/* Schedule story */}
            {hasScheduleStory && <ScheduleStoryAvatar />}

            {/* Other stories */}
            {otherGroups.map((group) => {
                const member = membersById.get(group.authorMemberId);
                if (!member) return null;
                return <StoryAvatar key={group.authorMemberId} group={group} member={member} />;
            })}
        </section>
    );
}
