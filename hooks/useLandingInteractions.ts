import { type RefObject, useEffect } from 'react';

import { useLandingFaqInteraction } from '@/hooks/useLandingFaqInteraction';
import { useLandingFeatureCarousel } from '@/hooks/useLandingFeatureCarousel';
import { useLandingStackMotion } from '@/hooks/useLandingStackMotion';
import { useLandingStoryInteractions } from '@/hooks/useLandingStoryInteractions';

export function useLandingInteractions(landingRef: RefObject<HTMLElement | null>) {
    useLandingStoryInteractions(landingRef);
    useLandingStackMotion(landingRef);
    useLandingFeatureCarousel(landingRef);
    useLandingFaqInteraction(landingRef);

    useEffect(() => {
        const root = landingRef.current;
        if (!root) return;

        const abortController = new AbortController();
        const { signal } = abortController;
        const mediaQuery = window.matchMedia('(max-width: 760px)');
        const menuToggle = root.querySelector<HTMLButtonElement>('.sw-mobile-menu-toggle');
        const menu = root.querySelector<HTMLElement>('.sw-mobile-menu-panel');
        const hero = root.querySelector<HTMLElement>('.sw-new-hero-inner');
        const heroCopy = root.querySelector<HTMLElement>('.sw-new-hero-copy');
        const heroVisual = root.querySelector<HTMLElement>('.sw-new-hero-visual');
        const heroCta = root.querySelector<HTMLElement>('.sw-new-hero-cta');
        const heroTitle = root.querySelector<HTMLElement>('.sw-new-hero-title');
        const phoneScreen = root.querySelector<HTMLElement>('.sw-phone-screen');
        const phoneTrack = root.querySelector<HTMLElement>('.sw-phone-feed-track');

        const setMenuOpen = (open: boolean) => {
            menuToggle?.classList.toggle('is-open', open);
            menu?.classList.toggle('is-open', open);
            menuToggle?.setAttribute('aria-expanded', String(open));
            const label = open ? menuToggle?.dataset.closeLabel : menuToggle?.dataset.openLabel;
            if (label) menuToggle?.setAttribute('aria-label', label);
        };

        const placeHeroCta = () => {
            if (!hero || !heroCopy || !heroVisual || !heroCta || !heroTitle) return;
            if (mediaQuery.matches) {
                if (heroCta.parentElement !== hero || heroCta.previousElementSibling !== heroVisual) {
                    heroVisual.insertAdjacentElement('afterend', heroCta);
                }
                return;
            }
            if (heroCta.parentElement !== heroCopy || heroCta.previousElementSibling !== heroTitle) {
                heroTitle.insertAdjacentElement('afterend', heroCta);
            }
        };

        const syncFeedTravel = () => {
            if (!phoneScreen || !phoneTrack) return;
            const distance = Math.max(0, Math.ceil(phoneTrack.scrollHeight - phoneScreen.clientHeight));
            phoneTrack.style.setProperty('--sw-feed-stop-1', `${-distance * 0.32}px`);
            phoneTrack.style.setProperty('--sw-feed-stop-2', `${-distance * 0.67}px`);
            phoneTrack.style.setProperty('--sw-feed-end', `${-distance}px`);
        };

        menuToggle?.addEventListener('click', () => setMenuOpen(!menu?.classList.contains('is-open')), { signal });
        menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false), { signal }));
        document.addEventListener(
            'click',
            (event) => {
                if (!mediaQuery.matches || !menu?.classList.contains('is-open')) return;
                if (menu.contains(event.target as Node) || menuToggle?.contains(event.target as Node)) return;
                setMenuOpen(false);
            },
            { signal }
        );

        const resizeObserver = phoneScreen && 'ResizeObserver' in window ? new ResizeObserver(syncFeedTravel) : null;
        if (phoneScreen) resizeObserver?.observe(phoneScreen);
        phoneTrack?.querySelectorAll('img').forEach((image) => {
            if (!image.complete) image.addEventListener('load', syncFeedTravel, { once: true, signal });
        });

        const handleResize = () => {
            if (!mediaQuery.matches) setMenuOpen(false);
            placeHeroCta();
            syncFeedTravel();
        };

        window.addEventListener('resize', handleResize, { passive: true, signal });
        placeHeroCta();
        syncFeedTravel();

        return () => {
            abortController.abort();
            resizeObserver?.disconnect();
        };
    }, [landingRef]);
}
