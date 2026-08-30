'use client';

import { EventsQuickRow } from '@/components/home/EventsQuickRow';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeNextEventCard } from '@/components/home/HomeNextEventCard';
import { useEventGridItems } from '@/hooks/useEventGridItems';
import { useMyEventList } from '@/hooks/useMyEventList';

export function HomeContent() {
    const { eventQueries, isLoading, memberships } = useMyEventList();
    const items = useEventGridItems(memberships, eventQueries);
    const hasEvents = memberships.length > 0;
    const feedSectionClassName = 'px-4 sm:px-8 lg:mx-auto lg:w-[clamp(32rem,40vw,42rem)] lg:px-0';

    return (
        <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
            {/* Ambient gradient */}
            <div
                aria-hidden="true"
                className="bg-gradient-logo pointer-events-none absolute inset-x-0 top-0 h-90 opacity-60 mask-[radial-gradient(ellipse_120%_100%_at_top,black,transparent_70%)]"
            />

            <div className="relative flex w-full flex-col gap-6 pt-8 pb-12 lg:pt-14">
                {/* Header */}
                <section className={feedSectionClassName}>
                    <HomeHeader />
                </section>

                {!isLoading && !hasEvents ? (
                    /* Empty state */
                    <section className={feedSectionClassName}>
                        <HomeEmptyState />
                    </section>
                ) : (
                    <>
                        {/* Next event */}
                        {!isLoading && (
                            <section className={feedSectionClassName}>
                                <HomeNextEventCard items={items} />
                            </section>
                        )}

                        {/* Your events */}
                        <EventsQuickRow items={items} isLoading={isLoading} contentClassName={feedSectionClassName} />
                    </>
                )}
            </div>
        </div>
    );
}
