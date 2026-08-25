'use client';

import { MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Banner } from '@/components/feed/Banner';
import { ComposerCard } from '@/components/feed/ComposerCard';
import { EventDescription } from '@/components/feed/EventDescription';
import { EventInfo } from '@/components/feed/EventInfo';
import { FeedPostRenderer } from '@/components/feed/FeedPostRenderer';
import { Header } from '@/components/feed/Header';
import { PostModal } from '@/components/feed/PostModal';
import { RsvpPrompt } from '@/components/feed/RsvpPrompt';
import { StoriesRow } from '@/components/feed/StoriesRow';
import { StoryModal } from '@/components/story/StoryModal';
import { routes } from '@/lib/routes';

import { useFeedPage } from './FeedPageContext';

export function FeedPageContent() {
    const t = useTranslations('FeedPage');
    const { event, eventId, isFetchingNextPage, isHost, loadMoreRef, loadingMoreLabel, moduleFlags, posts, storedRsvpId } = useFeedPage();
    const [storyId, setStoryId] = useState<string | null>(null);
    const hasLocation = Boolean(event.location.name || event.location.address || event.location.mapsUrl);

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
            <section>
                <Banner
                    image={event.coverMedia?.mediaUrl ?? null}
                    title={event.title}
                    actions={
                        <>
                            {hasLocation && (
                                <Link
                                    href={routes.tools.schedule}
                                    aria-label={t('location')}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/92 text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] transition-transform hover:-translate-y-0.5"
                                >
                                    <MapPin className="h-5 w-5" />
                                </Link>
                            )}
                            {moduleFlags.wishlist && (
                                <Link
                                    href={routes.tools.gifts}
                                    aria-label={t('giftAccount')}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/92 text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] transition-transform hover:-translate-y-0.5"
                                >
                                    <Image src="/icons/present.svg" alt="" width={22} height={22} className="h-5 w-5" />
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
                <section id="stories" className="top-0 border-b border-border bg-background/90 backdrop-blur-sm">
                    <StoriesRow eventId={eventId} onOpenStoryAction={openStoryModal} />
                </section>
            )}

            {event.description && <EventDescription eventId={event.id} description={event.description} />}

            {/* RSVP */}
            {moduleFlags.rsvp && !isHost && storedRsvpId === null && (
                <section>
                    <RsvpPrompt deadline={event.schedule.rsvpDeadline ?? null} />
                </section>
            )}

            {/* Posts */}
            <section id="posts">
                {moduleFlags.posts && (
                    <div className="flex flex-col px-0 pb-24 lg:pb-10">
                        <ComposerCard />
                        <div className="flex flex-col">
                            {posts.map((post, index) => (
                                <FeedPostRenderer key={post.id} post={post} isLcpCandidate={index === 0} />
                            ))}
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
