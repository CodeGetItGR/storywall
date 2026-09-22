import { useTranslations } from 'next-intl';
import { type TouchEvent, useRef, useState } from 'react';

const FEATURE_IMAGES = [
    '/landing/guest-viewing-the-storywall-invitation-on-a-phone.webp',
    '/landing/guest-scanning-the-storywall-qr-code.webp',
    '/landing/guest-confirming-the-storywall-rsvp.jpg',
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

export function useLandingFeatureDetails() {
    const t = useTranslations('LandingPage.featureDetails');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('next');
    const swipeStartX = useRef<number | null>(null);
    const details = t.raw('items') as FeatureDetail[];
    const availableDetails = details.map((detail, index) => ({ ...detail, imagePath: FEATURE_IMAGES[index]! }));

    const activeIndex = selectedIndex >= availableDetails.length ? 0 : selectedIndex;
    const selectDetail = (index: number) => () => {
        if (index === activeIndex) return;
        setTransitionDirection(index > activeIndex ? 'next' : 'previous');
        setSelectedIndex(index);
    };
    const selectPrevious = () => {
        setTransitionDirection('previous');
        setSelectedIndex((index) => (index <= 0 ? Math.max(availableDetails.length - 1, 0) : index - 1));
    };
    const selectNext = () => {
        setTransitionDirection('next');
        setSelectedIndex((index) => (availableDetails.length ? (index + 1) % availableDetails.length : 0));
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
        selectedIndex: activeIndex,
        selectDetail,
        selectNext,
        selectPrevious,
        startSwipe,
        t,
        transitionDirection,
        endSwipe,
    };
}
