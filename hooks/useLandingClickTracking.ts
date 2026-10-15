import { type RefObject, useEffect } from 'react';

import {
    LANDING_CLICK_SELECTOR,
    readLandingClick,
    readLandingFaqPosition,
    trackLandingClick,
    trackLandingFaq,
    trackLandingLanguage,
} from '@/lib/landingTracking';

// One listener for the whole landing page, so its server-rendered sections stay server components:
// a link opts in with landingClickAttributes(), an FAQ item with landingFaqAttributes().
export function useLandingClickTracking(landingRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const root = landingRef.current;
        if (!root) return;
        const abortController = new AbortController();

        root.addEventListener(
            'click',
            (event) => {
                if (!(event.target instanceof Element)) return;

                const link = event.target.closest(LANDING_CLICK_SELECTOR);
                const click = link ? readLandingClick(link) : null;
                if (click) {
                    trackLandingClick(click);
                    return;
                }

                // The shared language switcher: only a switch to the other language counts.
                const language = event.target.closest<HTMLButtonElement>('button[data-locale]');
                if (language?.dataset.locale && language.getAttribute('aria-pressed') === 'false' && !language.disabled) {
                    trackLandingLanguage(language.dataset.locale);
                }
            },
            { signal: abortController.signal },
        );

        // `toggle` doesn't bubble, so it's caught on the way down. Closing an item (or the FAQ closing
        // the others) isn't counted.
        root.addEventListener(
            'toggle',
            (event) => {
                if (!(event.target instanceof HTMLDetailsElement) || !event.target.open) return;
                const position = readLandingFaqPosition(event.target);
                if (position) trackLandingFaq(position);
            },
            { capture: true, signal: abortController.signal },
        );

        return () => abortController.abort();
    }, [landingRef]);
}
