import { type RefObject, useEffect } from 'react';

import { readVendorPageLink, trackVendorPageLink, VENDOR_PAGE_LINK_SELECTOR } from '@/lib/vendorPageTracking';

// One listener for the whole vendor page, so its server-rendered sections stay server components:
// a link opts in with vendorPageLinkAttributes().
export function useVendorPageClickTracking(pageRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const root = pageRef.current;
        if (!root) return;
        const abortController = new AbortController();

        root.addEventListener(
            'click',
            (event) => {
                if (!(event.target instanceof Element)) return;
                const link = event.target.closest(VENDOR_PAGE_LINK_SELECTOR);
                const tracked = link ? readVendorPageLink(link) : null;
                if (tracked) trackVendorPageLink(tracked);
            },
            { signal: abortController.signal },
        );

        return () => abortController.abort();
    }, [pageRef]);
}
