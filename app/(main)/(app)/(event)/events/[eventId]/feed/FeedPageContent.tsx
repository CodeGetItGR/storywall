'use client';

import { useCallback, useState } from 'react';

import { ComposerCard } from '@/components/feed/ComposerCard';
import { FeedEditPill } from '@/components/feed/edit/FeedEditPill';
import { LazyFeedEditTop } from '@/components/feed/edit/LazyFeedEditTop';
import { EventDescription } from '@/components/feed/EventDescription';
import { EventInfoSection } from '@/components/feed/EventInfoSection';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';
import { FeedPostRenderer } from '@/components/feed/FeedPostRenderer';
import { GuestOfferCard } from '@/components/feed/guestOffer/GuestOfferCard';
import { Header } from '@/components/feed/Header';
import { HeOrShePromptCard } from '@/components/feed/HeOrShePromptCard';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import { FeedModeSwitch } from '@/components/feed/layout/FeedModeSwitch';
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
import { useFeedMode } from '@/hooks/useFeedMode';
import { useFeedModeSwitchPin } from '@/hooks/useFeedModeSwitchPin';
import { useFeedModuleBlockPart } from '@/hooks/useFeedModuleBlockPart';
import { useFeedPageTheme } from '@/hooks/useFeedPageTheme';
import { useFeedTop } from '@/hooks/useFeedTop';
import { useHideMobileTabBarOnScroll } from '@/hooks/useHideMobileTabBarOnScroll';
import { useRsvpPromptVisible } from '@/hooks/useRsvpPromptVisible';
import { type FeedPageMode,feedPlaceHref } from '@/lib/feedMode';
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
    const moduleBlock = useFeedModuleBlockPart(event);
    const coverEvent = useFeedPageTheme(event, top.pageBackground, top.backdrop);
    const editMode = useFeedEditMode(event, isHost, isRoleLoading);
    const { start: startEditing, finish: finishEditing, editPill, cancelPill } = useFeedEditFocus(editMode.start, editMode.finish);
    const feedMode = useFeedMode(event);
    // null while the mode isn't known yet: the page keeps its loading state.
    const pageMode: FeedPageMode | null = feedMode.available ? feedMode.mode : 'single';
    const { ref: pinRef, pinned } = useFeedModeSwitchPin(pageMode !== null && pageMode !== 'single');
    // The Overview's Start editing (?edit=blocks) opens the invitation.
    const startFromLink = useCallback(() => {
        if (feedMode.available) feedMode.select('invitation');
        startEditing();
    }, [feedMode, startEditing]);
    useFeedEditTrigger({ settled: editMode.settled, canEdit: editMode.canEdit, start: startFromLink });
    const pill = feedMode.mode && <FeedModeSwitch mode={feedMode.mode} onSelect={feedMode.select} />;
    const modeSwitch = pill && (
        // Centred on the cover's bottom edge, half over it. While a copy is pinned under the header, it keeps its space.
        <div ref={pinRef} className={cn('relative z-10 -mt-6 flex justify-center', pinned && 'invisible')}>
            {pill}
        </div>
    );
    const topParts = {
        cover: (
            <FeedCoverBlock
                event={coverEvent}
                isHost={isHost}
                wishlist={moduleFlags.wishlist}
                clearPill={Boolean(modeSwitch)}
                corner={editMode.canEdit && !editMode.editing ? <FeedEditPill ref={editPill} onClick={startEditing} /> : undefined}
            />
        ),
        // Social Feed mode only (FeedTopFrame); signed-out visitors get it under the cover (KAN-246).
        dateRow: <EventInfoSection event={event} placeHref={feedPlaceHref(event)} className="mt-3 w-full px-4" />,
        stories: moduleFlags.stories && (
            // On a Save my date theme the row sits on the page's own background: inside the scope that draws
            // the backdrop, so it follows a theme held in edit mode too.
            <section
                id="stories"
                className="top-0 bg-event/90 backdrop-blur-sm [.feed-backdrop_&]:bg-transparent [.feed-backdrop_&]:backdrop-blur-none"
            >
                <StoriesRow eventId={eventId} onOpenStoryAction={openStoryModal} />
            </section>
        ),
        description: event.description && (
            <EventDescription eventId={event.id} description={event.description} keepShown={pageMode === 'invitation' || editMode.editing} />
        ),
        rsvp: shouldShowRSVP ? <FeedRsvpBlock eventId={eventId} deadline={event.schedule.rsvpDeadline ?? null} /> : null,
        moduleBlock,
    };

    const feedTop = <FeedTop view={top} mode={pageMode ?? 'single'} modeSwitch={modeSwitch} {...topParts} />;

    function openStoryModal(nextStoryId: string) {
        setStoryId(nextStoryId);
    }

    function closeStoryModal() {
        setStoryId(null);
    }

    // The mode lives on this device: until it's known the page keeps its loading state, so it never flashes the wrong mode.
    if (pageMode === null) return <FeedPageSkeleton />;

    return (
        <div className="mx-auto flex w-full flex-col lg:max-w-2xl">
            {/* Header */}
            <Header
                countdownTime={event.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0}
                eventId={eventId}
                pinned={pinned ? pill : undefined}
            />
            {/* Install */}
            <InstallAppBanner />
            {/* Invitation blocks, stories and RSVP */}
            {editMode.editing ? (
                <LazyFeedEditTop
                    event={event}
                    onDone={finishEditing}
                    cancelRef={cancelPill}
                    fallback={feedTop}
                    mode={pageMode}
                    modeSwitch={modeSwitch}
                    {...topParts}
                />
            ) : (
                feedTop
            )}

            {/* Posts: Feed mode and the one page */}
            {pageMode !== 'invitation' && (
                <section id="posts">
                    {moduleFlags.posts && (
                        <div
                            className={cn('flex flex-col px-0 pb-24 md:pb-10', {
                                'mt-4':
                                    (!moduleFlags.stories || !top.drawsMiddle || pageMode === 'feed') &&
                                    !(shouldShowRSVP && top.frame.rsvp && pageMode !== 'feed'),
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
            )}

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
