'use client';

import { useState } from 'react';

import { ComposerCard } from '@/components/feed/ComposerCard';
import { FeedEditPill } from '@/components/feed/edit/FeedEditPill';
import { LazyFeedEditTop } from '@/components/feed/edit/LazyFeedEditTop';
import { EventDescription } from '@/components/feed/EventDescription';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { FeedPostRenderer } from '@/components/feed/FeedPostRenderer';
import { GuestOfferCard } from '@/components/feed/guestOffer/GuestOfferCard';
import { Header } from '@/components/feed/Header';
import { HeOrShePromptCard } from '@/components/feed/HeOrShePromptCard';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import { FeedDetailsBlock } from '@/components/feed/layout/FeedDetailsBlock';
import { FeedRsvpBlock } from '@/components/feed/layout/FeedRsvpBlock';
import { FeedTop } from '@/components/feed/layout/FeedTop';
import { PartnerBrandingPromptModal } from '@/components/feed/partner/PartnerBrandingPromptModal';
import { PartnerFeedCard } from '@/components/feed/partner/PartnerFeedCard';
import { PostModal } from '@/components/feed/PostModal';
import { PublishQueueCards } from '@/components/feed/PublishQueueCards';
import { FeedQuickActions } from '@/components/feed/quickActions/FeedQuickActions';
import { StoriesRow } from '@/components/feed/StoriesRow';
import { InstallAppBanner } from '@/components/pwa/InstallAppBanner';
import { StoryModal } from '@/components/story/StoryModal';
import { VendorProfilePrompt } from '@/components/vendors/VendorProfilePrompt';
import { useFeedEditFocus } from '@/hooks/useFeedEditFocus';
import { useFeedEditMode } from '@/hooks/useFeedEditMode';
import { useFeedEditTrigger } from '@/hooks/useFeedEditTrigger';
import { useFeedItems } from '@/hooks/useFeedItems';
import { useFeedPageTheme } from '@/hooks/useFeedPageTheme';
import { useFeedTop } from '@/hooks/useFeedTop';
import { useHideMobileTabBarOnScroll } from '@/hooks/useHideMobileTabBarOnScroll';
import { useRsvpPromptVisible } from '@/hooks/useRsvpPromptVisible';
import { cn } from '@/lib/utils';

import { useFeedPage } from './FeedPageContext';

export function FeedPageContent() {
    useHideMobileTabBarOnScroll();
    const { currentMemberRsvpId, event, eventId, isFetchingNextPage, isHost, isRoleLoading, loadMoreRef, loadingMoreLabel, moduleFlags, posts } =
        useFeedPage();
    const feedItems = useFeedItems(posts, event.partnerBranding);
    const [storyId, setStoryId] = useState<string | null>(null);
    const shouldShowRSVP = useRsvpPromptVisible({ eventId, isHost, rsvpAvailable: moduleFlags.rsvp, rsvpId: currentMemberRsvpId });
    const top = useFeedTop(event);
    const coverEvent = useFeedPageTheme(event, top.pageBackground, top.backdrop);
    const editMode = useFeedEditMode(event, isHost, isRoleLoading);
    const { start: startEditing, finish: finishEditing, editPill, cancelPill } = useFeedEditFocus(editMode.start, editMode.finish);
    useFeedEditTrigger({ settled: editMode.settled, canEdit: editMode.canEdit, start: startEditing });
    const topParts = {
        cover: (
            <FeedCoverBlock
                event={coverEvent}
                isHost={isHost}
                wishlist={moduleFlags.wishlist}
                corner={editMode.canEdit && !editMode.editing ? <FeedEditPill ref={editPill} onClick={startEditing} /> : undefined}
            />
        ),
        details: <FeedDetailsBlock event={event} />,
        stories: moduleFlags.stories && (
            // On a Save my date theme the row sits on the page's own background.
            <section id="stories" className={cn('top-0', !top.backdrop && 'bg-event/90 backdrop-blur-sm')}>
                <StoriesRow eventId={eventId} onOpenStoryAction={openStoryModal} />
            </section>
        ),
        description: event.description && (
            <EventDescription eventId={event.id} description={event.description} keepShown={top.folds || editMode.editing} />
        ),
        rsvp: shouldShowRSVP ? <FeedRsvpBlock eventId={eventId} deadline={event.schedule.rsvpDeadline ?? null} /> : null,
    };

    const feedTop = <FeedTop view={top} {...topParts} />;

    function openStoryModal(nextStoryId: string) {
        setStoryId(nextStoryId);
    }

    function closeStoryModal() {
        setStoryId(null);
    }

    return (
        <div className="mx-auto flex w-full flex-col lg:max-w-2xl">
            {/* Header */}
            <Header countdownTime={event.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0} eventId={eventId} />
            {/* Install */}
            <InstallAppBanner />
            {/* Invitation blocks, stories and RSVP */}
            {editMode.editing ? (
                <LazyFeedEditTop event={event} onDone={finishEditing} cancelRef={cancelPill} fallback={feedTop} {...topParts} />
            ) : (
                feedTop
            )}

            {/* Posts */}
            <section id="posts">
                {moduleFlags.posts && (
                    <div
                        className={cn('flex flex-col px-0 pb-24 md:pb-10', {
                            'mt-4': (!moduleFlags.stories || !top.drawsMiddle) && !(shouldShowRSVP && top.frame.rsvp),
                        })}
                    >
                        <ComposerCard />
                        {/* Quick actions, with a vendor's own tools first */}
                        <FeedQuickActions event={event} isHost={isHost} />
                        <PublishQueueCards />
                        {/* Guest offer */}
                        <GuestOfferCard eventId={eventId} isHost={isHost} />
                        {/* Boy or Girl? prompt */}
                        <HeOrShePromptCard eventId={eventId} eventType={event.eventType} enabled={moduleFlags.he_or_she} />
                        <div className="flex flex-col">
                            {posts.length === 0 ? (
                                <FeedEmptyState />
                            ) : (
                                feedItems.map((item) =>
                                    item.kind === 'post' ? (
                                        <FeedPostRenderer key={item.post.id} post={item.post} isLcpCandidate={item.index === 0} />
                                    ) : (
                                        /* Partner card */
                                        event.partnerBranding && <PartnerFeedCard key={item.key} branding={event.partnerBranding} />
                                    ),
                                )
                            )}
                            <div ref={loadMoreRef} className="h-1" />
                            {isFetchingNextPage && <p className="py-2 text-center text-sm text-ink-muted">{loadingMoreLabel}</p>}
                        </div>
                    </div>
                )}
                {/* Quick actions and vendor tools, when the plan has no posts */}
                {!moduleFlags.posts && (
                    <div className="pb-24 md:pb-10">
                        <FeedQuickActions event={event} isHost={isHost} />
                    </div>
                )}
            </section>

            <PostModal />

            {/* Story Popup */}
            <StoryModal open={storyId !== null} storyId={storyId} onCloseAction={closeStoryModal} />

            {/* Partner card prompt */}
            {isHost && <PartnerBrandingPromptModal eventId={eventId} prompt={event.partnerBrandingPrompt} />}

            {/* Vendor profile prompt */}
            {!isHost && <VendorProfilePrompt eventId={eventId} />}
        </div>
    );
}
