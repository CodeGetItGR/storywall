'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { EventRouteSpinner, useEventRouteContext } from '@/components/routing/EventRouteGate';
import { StoryHeader, StoryProgressBar } from '@/components/story';
import { ScheduleStoryDateBadge } from '@/components/story/ScheduleStoryDateBadge';
import { ScheduleStoryContent } from '@/components/story/ScheduleStoryContent';
import { useEventSessions } from '@/hooks/useEventSessions';
import { routes } from '@/lib/routes';

function noop() {}

export function ScheduleStoryScreen() {
    const { activeEvent, eventId } = useEventRouteContext();
    const t = useTranslations('StoryPage');
    const locale = useLocale();
    const router = useRouter();
    const { data: sessions = [], isLoading } = useEventSessions(eventId);

    function handleCloseStory() {
        router.back();
    }

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink">
                <EventRouteSpinner />
            </div>
        );
    }

    if (sessions.length === 0) {
        router.replace(routes.feed);
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink">
            <div className="relative h-full max-h-dvh w-full max-w-sm overflow-hidden bg-[#1c2333]">
                {/* Header Curtain */}
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[#283248] via-[#283248]/68 to-transparent"
                    aria-hidden="true"
                />

                {/* Static Progress */}
                <StoryProgressBar staticLabel={t('scheduleStaticProgress')} />

                {/* Header */}
                <StoryHeader
                    authorName={t('scheduleAuthor')}
                    authorId={eventId}
                    timeStr={activeEvent.title}
                    canManage={false}
                    canDelete={false}
                    showMenu={false}
                    leadingVisual={
                        <ScheduleStoryDateBadge date={activeEvent.schedule.startAt} locale={locale} size="sm" />
                    }
                    onToggleMenu={noop}
                    onClose={handleCloseStory}
                    onDeleteRequest={noop}
                />

                <ScheduleStoryContent sessions={sessions} locale={locale} />
            </div>
        </div>
    );
}
