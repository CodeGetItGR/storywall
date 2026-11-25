'use client';

import { useCallback, useState } from 'react';

import { ComposerCard } from '@/components/feed/ComposerCard';
import { FeedEditPillRow } from '@/components/feed/edit/FeedEditPillRow';
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
import { useFeedModuleBlockPart } from '@/hooks/useFeedModuleBlockPart';
import { useFeedPageTheme } from '@/hooks/useFeedPageTheme';
import { useFeedSectionPart } from '@/hooks/useFeedSectionPart';
import { useFeedTop } from '@/hooks/useFeedTop';
import { useHideMobileTabBar } from '@/hooks/useHideMobileTabBar';
import { useHideMobileTabBarOnScroll } from '@/hooks/useHideMobileTabBarOnScroll';
import { useRsvpPromptVisible } from '@/hooks/useRsvpPromptVisible';
import { type FeedPageMode, feedPlaceHref } from '@/lib/feedMode';
import { hasFeedSection } from '@/lib/feedSections';
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
    const feedSection = useFeedSectionPart(event, top.ctx.media);
    const coverEvent = useFeedPageTheme(event, top.pageBackground, top.backdrop);
    const editMode = useFeedEditMode(event, isHost, isRoleLoading);
    const { start: startEditing, finish: finishEditing, editPill, cancelPill } = useFeedEditFocus(editMode.start, editMode.finish);
    const feedMode = useFeedMode(event);
    // null while the mode isn't known yet: the page keeps its loading state.
    const pageMode: FeedPageMode | null = feedMode.available ? feedMode.mode : 'single';
    // The invitation takes the whole phone: the switch to Social Feed brings the tab bar back.
    const tabBarAway = pageMode === 'invitation';
    useHideMobileTabBar(tabBarAway, 'feed-invitation');
    // The Overview's Start editing (?edit=blocks) opens the invitation.
    const startFromLink = useCallback(() => {
        if (feedMode.available) feedMode.select('invitation');
        startEditing();
    }, [feedMode, startEditing]);
    useFeedEditTrigger({ settled: editMode.settled, canEdit: editMode.canEdit, start: startFromLink });
    const modeSwitch =
        feedMode.mode &&
        (editMode.editing ? (
            // No switch while editing: the host edits the mode they were in. Its room stays, so nothing jumps.
            <div className="h-5" />
        ) : (
            // Centred on the cover's bottom edge, half over it. It scrolls away with the cover.
            <div className="relative z-10 -mt-5 flex justify-center">
                <FeedModeSwitch mode={feedMode.mode} onSelect={feedMode.select} />
            </div>
        ));
    const topParts = {
        cover: (
            <FeedCoverBlock
                event={coverEvent}
                isHost={isHost}
                wishlist={moduleFlags.wishlist}
                clearPill={Boolean(modeSwitch)}
                editing={editMode.editing}
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

    // What guests see differently from the host editing, for edit mode's preview.
    const guestParts = {
        cover: <FeedCoverBlock event={coverEvent} isHost={false} wishlist={moduleFlags.wishlist} clearPill={Boolean(modeSwitch)} />,
        rsvp: moduleFlags.rsvp ? <FeedRsvpBlock eventId={eventId} deadline={event.schedule.rsvpDeadline ?? null} /> : null,
    };

    // Feed mode's sections go to the member page only: edit mode draws its own, where a pinned photo takes no tap.
    const feedTop = (
        <FeedTop
            view={top}
            mode={pageMode ?? 'single'}
            modeSwitch={modeSwitch}
            editRow={editMode.canEdit && <FeedEditPillRow editing={editMode.editing} pillRef={editPill} onEdit={startEditing} />}
            {...topParts}
            feedSection={feedSection}
        />
    );

    function openStoryModal(nextStoryId: string) {
        setStoryId(nextStoryId);
    }

    function closeStoryModal() {
        setStoryId(null);
    }

    // The mode lives on this device: until it's known the page keeps its loading state, so it never flashes the wrong mode.
    if (pageMode === null) return <FeedPageSkeleton />;

    return (
        <div className="mx-auto flex w-full flex-col lg:max-w-2xl" data-tab-bar-away={tabBarAway || undefined}>
            {/* Header */}
            <Header countdownTime={event.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0} eventId={eventId} />
            {/* Install */}
            <InstallAppBanner />
            {/* Invitation blocks, stories and RSVP */}
            {editMode.editing ? (
                <LazyFeedEditTop
                    event={event}
                    scope={editMode.scope}
                    guest={guestParts}
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
                            {/* Boy or Girl? prompt: the fixed card, unless the host placed the section */}
                            {!hasFeedSection(top.sections, 'feedHeOrShe') && (
                                <HeOrShePromptCard eventId={eventId} eventType={event.eventType} enabled={moduleFlags.he_or_she} />
                            )}
                            <div className="flex flex-col">
                                {posts.length === 0 ? (
                                    <FeedEmptyState />
                                ) : (
                                    feedItems.map((item) =>
                                        item.kind === 'post' ? (
                                            <FeedPostRenderer key={item.post.id} post={item.post} isLcpCandidate={item.index === 0} />
                                        ) : (
                                            /* Partner card */
                                            event.partnerBranding && <PartnerFeedCard key={item.key} branding={event.partnerBranding} eventId={eventId} />
                                        ),
                                    )
                                )}
                                <div ref={loadMoreRef} className="h-1" />
                                {isFetchingNextPage && <p className="on-page py-2 text-center text-sm text-ink-muted">{loadingMoreLabel}</p>}
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
