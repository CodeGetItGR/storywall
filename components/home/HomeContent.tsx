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
        <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
            {/* Ambient gradient */}
            <div
                aria-hidden="true"
                className="bg-gradient-logo pointer-events-none absolute inset-x-0 top-0 h-90 opacity-60 mask-[radial-gradient(ellipse_120%_100%_at_top,black,transparent_70%)]"
            />

            <div className="relative flex w-full flex-col gap-6 pt-8 pb-12 lg:pt-14">
                {/* Header */}
                <section className="px-4 sm:px-8 lg:px-14 2xl:px-20">
                    <HomeHeader />
                </section>

                {!isLoading && !hasEvents ? (
                    /* Empty state */
                    <section className="px-4 sm:px-8 lg:px-14 2xl:px-20">
                        <HomeEmptyState />
                    </section>
                ) : (
                    <>
                        {/* Stats */}
                        {!isLoading && (
                            <section className="px-4 sm:px-8 lg:px-14 2xl:px-20">
                                <HomeStats items={items} />
                            </section>
                        )}

                        {/* Next event */}
                        {!isLoading && (
                            <section className="px-4 sm:px-8 lg:px-14 2xl:px-20">
                                <HomeNextEventCard items={items} />
                            </section>
                        )}

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
