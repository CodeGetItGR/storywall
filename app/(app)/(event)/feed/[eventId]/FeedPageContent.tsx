'use client';

import { Banner } from '@/components/feed/Banner';
import { ComposerCard } from '@/components/feed/ComposerCard';
import { EventDescription } from '@/components/feed/EventDescription';
import { EventInfo } from '@/components/feed/EventInfo';
import { FeedPostRenderer } from '@/components/feed/FeedPostRenderer';
import { Header } from '@/components/feed/Header';
import { PostModal } from '@/components/feed/PostModal';
import { RsvpPrompt } from '@/components/feed/RsvpPrompt';
import { StoriesRow } from '@/components/feed/StoriesRow';

import { useFeedPage } from './FeedPageContext';

export function FeedPageContent() {
    const { event, eventId, isFetchingNextPage, isHost, loadMoreRef, loadingMoreLabel, moduleFlags, posts, storedRsvpId } = useFeedPage();
    console.log(event)
    return (
        <div className="mx-auto flex w-full flex-col lg:max-w-2xl">
            <Header countdownTime={event.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0} />
            <section>
                <Banner image={event.coverMedia?.mediaUrl ?? ''} title={event.title} />
            </section>

            <section className="mt-3">
                <EventInfo
                    date={event.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0}
                    place={event.location.name ?? event.location.address ?? ''}
                    className="w-full px-4"
                />
            </section>

            {moduleFlags.stories && (
                <section id="stories" className="top-0 border-b border-border bg-background/90 backdrop-blur-sm">
                    <StoriesRow eventId={eventId} />
                </section>
            )}

            {event.description && <EventDescription eventId={event.id} description={event.description} />}

            {moduleFlags.rsvp && !isHost && storedRsvpId === null && (
                <section>
                    <RsvpPrompt deadline={event.schedule.rsvpDeadline ?? null} />
                </section>
            )}

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
        </div>
    );
}
