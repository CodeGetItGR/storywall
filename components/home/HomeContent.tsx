'use client';

import { EmailVerificationBanner } from '@/components/common/EmailVerificationBanner';
import { EventsQuickRow } from '@/components/home/EventsQuickRow';
import { HomeCreateEventButton } from '@/components/home/HomeCreateEventButton';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeNextEventCard } from '@/components/home/HomeNextEventCard';
import { HOME_SECTION_CLASS_NAME, HomeNextEventCardSkeleton } from '@/components/home/HomeSkeletons';
import { HomeVerifyEmailState } from '@/components/home/HomeVerifyEmailState';
import { useHomeContent } from '@/hooks/useHomeContent';

export function HomeContent() {
    const { canCreateEvent, emptyState, isLoading, items, showCreateButton, showVerifyBanner } = useHomeContent();
    const feedSectionClassName = HOME_SECTION_CLASS_NAME;

    return (
        <div className="relative h-full w-full overflow-x-hidden overflow-y-auto">
            {/* Ambient gradient */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-90 mask-[radial-gradient(ellipse_120%_100%_at_top,black,transparent_70%)] opacity-60 bg-gradient-logo"
            />

            <div className="relative flex w-full flex-col gap-6 pt-8 pb-12 lg:pt-14">
                {/* Header */}
                <section className={feedSectionClassName}>
                    <HomeHeader />
                </section>

                {/* Create */}
                {showCreateButton && (
                    <section className={feedSectionClassName}>
                        <HomeCreateEventButton />
                    </section>
                )}

                {/* Email verification notice */}
                {showVerifyBanner && (
                    <section className={feedSectionClassName}>
                        <EmailVerificationBanner />
                    </section>
                )}

                {emptyState ? (
                    /* Empty state */
                    <section className={feedSectionClassName}>{emptyState === 'verifyEmail' ? <HomeVerifyEmailState /> : <HomeEmptyState />}</section>
                ) : (
                    <>
                        {/* Next event */}
                        <section className={feedSectionClassName}>
                            {isLoading ? <HomeNextEventCardSkeleton /> : <HomeNextEventCard items={items} />}
                        </section>

                        {/* Your events */}
                        <EventsQuickRow items={items} isLoading={isLoading} contentClassName={feedSectionClassName} canCreateEvent={canCreateEvent} />
                    </>
                )}
            </div>
        </div>
    );
}
