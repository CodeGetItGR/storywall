'use client';

import { useEffect, useRef } from 'react';

import { useMobileChrome } from '@/providers/MobileChromeProvider';

const FEED_SCROLL_HIDE_REASON = 'feed-scroll';

export function useHideMobileTabBarOnScroll() {
    const { hideMobileTabBar, showMobileTabBar } = useMobileChrome();
    const previousScrollTopRef = useRef(0);

    useEffect(() => {
        const scrollContainer = document.querySelector('main');
        if (!(scrollContainer instanceof HTMLElement)) return;

        const updateVisibility = () => {
            const currentScrollTop = scrollContainer.scrollTop;
            const scrollDelta = currentScrollTop - previousScrollTopRef.current;

            previousScrollTopRef.current = currentScrollTop;

            if (currentScrollTop <= 0) {
                showMobileTabBar(FEED_SCROLL_HIDE_REASON);
                return;
            }

            if (scrollDelta > 0) {
                hideMobileTabBar(FEED_SCROLL_HIDE_REASON);
                return;
            }

            if (scrollDelta < 0) {
                showMobileTabBar(FEED_SCROLL_HIDE_REASON);
            }
        };

        previousScrollTopRef.current = scrollContainer.scrollTop;
        updateVisibility();
        scrollContainer.addEventListener('scroll', updateVisibility, { passive: true });

        return () => {
            scrollContainer.removeEventListener('scroll', updateVisibility);
            showMobileTabBar(FEED_SCROLL_HIDE_REASON);
        };
    }, [hideMobileTabBar, showMobileTabBar]);
}
