import { type RefObject, useEffect } from 'react';

import { LANDING_SECTION_SELECTOR, type LandingSection, readLandingSection, trackLandingSection } from '@/lib/landingTracking';

// Fine enough to notice half of a section several screens tall coming into view.
const THRESHOLDS = Array.from({ length: 21 }, (_, index) => index / 20);

// How long a section stays in view before it counts. A nav link's smooth scroll or a fast flick passes
// over the sections in between in a fraction of that.
export const LANDING_SECTION_DWELL_MS = 1000;

// Half of the section is on screen, or it fills half the screen when it's taller than that.
function isReached(entry: IntersectionObserverEntry): boolean {
    const viewportHeight = entry.rootBounds?.height ?? window.innerHeight;
    return entry.intersectionRect.height >= Math.min(entry.boundingClientRect.height, viewportHeight) / 2;
}

// Sends one event per section the first time the visitor stops on it, so the dashboard shows where
// people stop scrolling. Sections that mount late (the lazy social and host stack, pricing waiting on
// the config) are picked up when they appear.
export function useLandingSectionTracking(landingRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const root = landingRef.current;
        if (!root) return;
        const reached = new Set<LandingSection>();
        const observed = new WeakSet<Element>();
        const pending = new Map<Element, ReturnType<typeof setTimeout>>();

        function cancel(target: Element) {
            clearTimeout(pending.get(target));
            pending.delete(target);
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const { target } = entry;
                    const section = readLandingSection(target);
                    if (!section) continue;
                    if (!isReached(entry)) {
                        cancel(target);
                        continue;
                    }
                    if (pending.has(target)) continue;

                    pending.set(
                        target,
                        setTimeout(() => {
                            pending.delete(target);
                            observer.unobserve(target);
                            if (reached.has(section)) return;
                            reached.add(section);
                            trackLandingSection(section);
                        }, LANDING_SECTION_DWELL_MS),
                    );
                }
            },
            { threshold: THRESHOLDS },
        );

        function observeNewSections() {
            root?.querySelectorAll(LANDING_SECTION_SELECTOR).forEach((section) => {
                if (observed.has(section)) return;
                observed.add(section);
                observer.observe(section);
            });
        }

        observeNewSections();
        // Child lists only: the hero typewriter's text changes don't wake it.
        const mutations = new MutationObserver(observeNewSections);
        mutations.observe(root, { childList: true, subtree: true });

        return () => {
            mutations.disconnect();
            observer.disconnect();
            pending.forEach((timer) => clearTimeout(timer));
        };
    }, [landingRef]);
}
