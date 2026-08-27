'use client';

import { EventsQuickRow } from '@/components/home/EventsQuickRow';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeModulesShowcase } from '@/components/home/HomeModulesShowcase';
import { HomeNextEventCard } from '@/components/home/HomeNextEventCard';
import { HomeStats } from '@/components/home/HomeStats';
import { useEventGridItems } from '@/hooks/useEventGridItems';
import { useMyEventList } from '@/hooks/useMyEventList';

export function HomeContent() {
    const { eventQueries, isLoading, memberships } = useMyEventList();
    const items = useEventGridItems(memberships, eventQueries);
    const hasEvents = memberships.length > 0;

    return (
        <div className="relative min-h-full w-full overflow-hidden">
            {/* Ambient gradient */}
            <div
                aria-hidden="true"
                className="bg-gradient-logo pointer-events-none absolute inset-x-0 top-0 h-90 opacity-60 [mask-image:radial-gradient(ellipse_120%_100%_at_top,black,transparent_70%)]"
            />

            <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-8 pb-12 lg:pt-14">
                {/* Header */}
                <HomeHeader />

                {!isLoading && !hasEvents ? (
                    <HomeEmptyState />
                ) : (
                    <>
                        {/* Stats */}
                        {!isLoading && <HomeStats items={items} />}

                        {/* Next event */}
                        {!isLoading && <HomeNextEventCard items={items} />}

                        {/* Your events */}
                        <EventsQuickRow items={items} isLoading={isLoading} />
                    </>
                )}

                {/* Discover */}
                <HomeModulesShowcase />
            </div>
        </div>
    );
}
