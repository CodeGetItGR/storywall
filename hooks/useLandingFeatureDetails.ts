import { useTranslations } from 'next-intl';
import { type TouchEvent, useEffect, useRef, useState } from 'react';

const FEATURE_IMAGES = [
    '/landing/guest-viewing-the-storywall-invitation-on-a-phone.webp',
    '/landing/guest-scanning-the-storywall-qr-code.webp',
    '/landing/guest-confirming-the-storywall-rsvp.webp',
    '/landing/guest-sharing-a-wish-in-the-storywall-guestbook.webp',
] as const;

type FeatureDetail = {
    description: string;
    imageAlt: string;
    items: string[];
    subtitle: string;
    title: string;
};

type TransitionDirection = 'next' | 'previous';

// Matches the strip's px-5 gutter so a revealed tab never sits flush to the edge.
const TAB_STRIP_GUTTER = 20;

export function useLandingFeatureDetails() {
    const t = useTranslations('LandingPage.featureDetails');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('next');
    const swipeStartX = useRef<number | null>(null);
    const tabListRef = useRef<HTMLDivElement | null>(null);
    const details = t.raw('items') as FeatureDetail[];
    const availableDetails = details.map((detail, index) => ({ ...detail, imagePath: FEATURE_IMAGES[index]! }));

    const activeIndex = selectedIndex >= availableDetails.length ? 0 : selectedIndex;
    const lastIndex = Math.max(availableDetails.length - 1, 0);
    const canSelectPrevious = activeIndex > 0;
    const canSelectNext = activeIndex < lastIndex;

    // The tab strip scrolls independently of the panel, so a swipe that changes
    // the panel has to drag the matching tab back into view or the last tabs
    // stay off-screen. scrollIntoView stops at the scrollport edge, which leaves
    // the tab flush against the screen, so the offset is measured by hand to
    // keep the strip's own gutter on whichever side the tab came in from.
    useEffect(() => {
        const strip = tabListRef.current;
        const activeTab = strip?.children[activeIndex];
        if (!strip || !activeTab) return;
        const stripEdges = strip.getBoundingClientRect();
        const tabEdges = activeTab.getBoundingClientRect();
        const overflowStart = tabEdges.left - stripEdges.left - TAB_STRIP_GUTTER;
        const overflowEnd = tabEdges.right - stripEdges.right + TAB_STRIP_GUTTER;
        const offset = overflowStart < 0 ? overflowStart : Math.max(overflowEnd, 0);
        if (!offset) return;
        strip.scrollTo({ behavior: 'smooth', left: strip.scrollLeft + offset });
    }, [activeIndex]);

    const selectDetail = (index: number) => () => {
        if (index === activeIndex) return;
        setTransitionDirection(index > activeIndex ? 'next' : 'previous');
        setSelectedIndex(index);
    };
    const selectPrevious = () => {
        if (!canSelectPrevious) return;
        setTransitionDirection('previous');
        setSelectedIndex((index) => index - 1);
    };
    const selectNext = () => {
        if (!canSelectNext) return;
        setTransitionDirection('next');
        setSelectedIndex((index) => index + 1);
    };
    const startSwipe = (event: TouchEvent<HTMLElement>) => {
        swipeStartX.current = event.changedTouches[0]?.clientX ?? null;
    };
    const endSwipe = (event: TouchEvent<HTMLElement>) => {
        const startX = swipeStartX.current;
        const endX = event.changedTouches[0]?.clientX;
        swipeStartX.current = null;
        if (startX === null || endX === undefined || Math.abs(endX - startX) < 48) return;
        if (endX < startX) selectNext();
        else selectPrevious();
    };

    return {
        activeDetail: availableDetails[activeIndex] ?? null,
        availableDetails,
        canSelectNext,
        canSelectPrevious,
        selectedIndex: activeIndex,
        selectDetail,
        selectNext,
        selectPrevious,
        startSwipe,
        t,
        tabListRef,
        transitionDirection,
        endSwipe,
    };
}
