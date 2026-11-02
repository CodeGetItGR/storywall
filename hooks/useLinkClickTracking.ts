import { useEffect } from 'react';

import { LINK_CLICK_SELECTOR, readLinkClick, sendLinkClick } from '@/lib/linkClicks';

// One listener for every public page, so the links stay in server components: a link opts in with
// linkClickAttributes().
export function useLinkClickTracking() {
    useEffect(() => {
        const abortController = new AbortController();
        document.addEventListener(
            'click',
            (event) => {
                if (!(event.target instanceof Element)) return;
                const link = event.target.closest(LINK_CLICK_SELECTOR);
                const click = link ? readLinkClick(link) : null;
                if (click) sendLinkClick(click, window.location.pathname);
            },
            { signal: abortController.signal },
        );
        return () => abortController.abort();
    }, []);
}
