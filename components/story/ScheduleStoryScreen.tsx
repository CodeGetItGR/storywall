'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { StoryHeader, StoryProgressBar } from '@/components/story';
import { ScheduleStoryContent } from '@/components/story/ScheduleStoryContent';
import { ScheduleStoryDateBadge } from '@/components/story/ScheduleStoryDateBadge';
import { ScheduleStoryFrame } from '@/components/story/ScheduleStoryFrame';
import { ScheduleStorySkeleton } from '@/components/story/ScheduleStorySkeleton';
import { useEventSessions } from '@/hooks/useEventSessions';
import { useActiveModuleCopy } from '@/hooks/useModuleCopy';
import { routes } from '@/lib/routes';

function noop() {}

export function ScheduleStoryScreen() {
    const { activeEvent, eventId } = useEventRouteContext();
    const t = useTranslations('StoryPage');
    const scheduleName = useActiveModuleCopy('schedule').name;
    const locale = useLocale();
    const router = useRouter();
    const { data: sessions = [], isLoading } = useEventSessions(eventId);

    function handleCloseStory() {
        router.back();
    }

    if (isLoading) {
        return <ScheduleStorySkeleton />;
    }

    if (sessions.length === 0) {
        router.replace(routes.events.feed(eventId));
        return null;
    }

    return (
        <ScheduleStoryFrame
            header={
                <>
                    {/* Static Progress */}
                    <StoryProgressBar staticLabel={t('scheduleStaticProgress')} tone="light" />

                    {/* Story Header */}
                    <StoryHeader
                        authorName={scheduleName}
                        authorId={eventId}
                        timeStr={activeEvent.title}
                        tone="light"
                        canManage={false}
                        canDelete={false}
                        canReport={false}
                        canReportRole={false}
                        showMenu={false}
                        leadingVisual={<ScheduleStoryDateBadge date={activeEvent.schedule.startAt} locale={locale} size="sm" />}
                        onToggleMenu={noop}
                        onClose={handleCloseStory}
                        onDeleteRequest={noop}
                        onReportRequest={noop}
                        onReportRoleRequest={noop}
                        showAvatar={false}
                    />
                </>
            }
        >
            <ScheduleStoryContent sessions={sessions} locale={locale} />
        </ScheduleStoryFrame>
    );
}
