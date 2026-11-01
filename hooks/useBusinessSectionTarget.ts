'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { BUSINESS_SECTION_IDS, isBusinessPageSection } from '@/lib/business';
import { replacePageUrl } from '@/lib/overlayHistory';

// Arriving from another page with ?section=… (the event page's print prices link): once the page's sections are on
// screen, scroll to that section and drop the param.
export function useBusinessSectionTarget(ready: boolean) {
    const param = useSearchParams().get('section');
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current || !ready || !isBusinessPageSection(param)) return;
        handled.current = true;

        const url = new URL(window.location.href);
        url.searchParams.delete('section');
        replacePageUrl(`${url.pathname}${url.search}${url.hash}`);

        document.getElementById(BUSINESS_SECTION_IDS[param])?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, [param, ready]);
}
