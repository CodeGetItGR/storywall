'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Banner } from '@/components/feed/Banner';
import { ComposerCard } from '@/components/feed/ComposerCard';
import { EventDescription } from '@/components/feed/EventDescription';
import { EventInfo } from '@/components/feed/EventInfo';
import { EventSessionActionButtons } from '@/components/feed/EventSessionActionButtons';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { FeedPostRenderer } from '@/components/feed/FeedPostRenderer';
import { Header } from '@/components/feed/Header';
import { PostModal } from '@/components/feed/PostModal';
import { RsvpPrompt } from '@/components/feed/RsvpPrompt';
import { StoriesRow } from '@/components/feed/StoriesRow';
import { StoryModal } from '@/components/story/StoryModal';
import { useHideMobileTabBarOnScroll } from '@/hooks';
import { coverPhotoSettingsHref } from '@/lib/manageSectionTargets';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { useFeedPage } from './FeedPageContext';

export function FeedPageContent() {
    const t = useTranslations('FeedPage');
    useHideMobileTabBarOnScroll();
    const { currentMemberRsvpId, event, eventId, isFetchingNextPage, isHost, loadMoreRef, loadingMoreLabel, moduleFlags, posts } = useFeedPage();
    const [storyId, setStoryId] = useState<string | null>(null);
    const [pageLoaded, setPageLoaded] = useState(false);
    const shouldShowRSVP = moduleFlags.rsvp && !isHost && currentMemberRsvpId === null;

    useEffect(() => {
        const markLoaded = () => setPageLoaded(true);

        if (document.readyState === 'complete') {
            markLoaded();
            return;
        }

        window.addEventListener('load', markLoaded, { once: true });
        return () => window.removeEventListener('load', markLoaded);
    }, []);

    function openStoryModal(nextStoryId: string) {
        setStoryId(nextStoryId);
    }

    function closeStoryModal() {
        setStoryId(null);
    }

    return (
        <div className="mx-auto flex w-full flex-col lg:max-w-2xl">
            {/* Header */}
            <Header countdownTime={event.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0} />
            {/* Hero */}
            <section className={'mt-3'}>
                <Banner
                    image={event.coverMedia?.mediaUrl ?? null}
                    title={event.title}
                    glowVisible={pageLoaded}
                    fallbackActionHref={isHost ? coverPhotoSettingsHref(eventId) : undefined}
                    fallbackActionLabel={isHost ? t('addCoverPhoto') : undefined}
                    actions={
                        <>
                            <EventSessionActionButtons event={event} />
                            {moduleFlags.wishlist && (
                                <Link
                                    href={routes.events.tools.gifts(eventId)}
                                    aria-label={t('giftAccount')}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/92 text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] transition-transform hover:-translate-y-0.5"
                                >
                                    <Image src="/icons/present.svg" alt="" width={22} height={22} className="h-5 w-5" unoptimized />
                                </Link>
                            )}
                        </>
                    }
                />
            </section>

            {/* Event details */}
            <section className="mt-3">
                <EventInfo
                    date={event.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0}
                    place={event.location.name ?? event.location.address ?? ''}
                    className="w-full px-4"
                />
            </section>

            {/* Stories */}
            {moduleFlags.stories && (
                <section id="stories" className={cn('top-0 bg-background/90 backdrop-blur-sm')}>
                    <StoriesRow eventId={eventId} onOpenStoryAction={openStoryModal} />
                </section>
            )}

            {event.description && <EventDescription eventId={event.id} description={event.description} />}

            {/* RSVP */}
            {shouldShowRSVP && (
                <section className={'px-4 pb-5'}>
                    <RsvpPrompt eventId={eventId} deadline={event.schedule.rsvpDeadline ?? null} />
                </section>
            )}

            {/* Posts */}
            <section id="posts">
                {moduleFlags.posts && (
                    <div className="flex flex-col px-0 pb-24 lg:pb-10">
                        <ComposerCard />
                        <div className="flex flex-col">
                            {posts.length === 0 ? (
                                <FeedEmptyState />
                            ) : (
                                posts.map((post, index) => <FeedPostRenderer key={post.id} post={post} isLcpCandidate={index === 0} />)
                            )}
                            <div ref={loadMoreRef} className="h-1" />
                            {isFetchingNextPage && <p className="py-2 text-center text-sm text-ink-muted">{loadingMoreLabel}</p>}
                        </div>
                    </div>
                )}
            </section>

            <PostModal />

            {/* Story Popup */}
            <StoryModal open={storyId !== null} storyId={storyId} onCloseAction={closeStoryModal} />
        </div>
    );
}
