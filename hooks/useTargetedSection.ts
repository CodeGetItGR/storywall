'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { replacePageUrl } from '@/lib/overlayHistory';

const HIGHLIGHT_DURATION_MS = 2200;

export function useTargetedSection(sectionId: string) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const sectionRef = useRef<HTMLElement>(null);
    const [isTargeted, setIsTargeted] = useState(false);

    useEffect(() => {
        if (searchParams.get('section') !== sectionId) return;

        const section = sectionRef.current;
        if (!section) return;

        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        section.focus({ preventScroll: true });
        setIsTargeted(true);

        const highlightTimer = window.setTimeout(() => setIsTargeted(false), HIGHLIGHT_DURATION_MS);
        const urlTimer = window.setTimeout(() => {
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.delete('section');
            const query = nextParams.toString();
            // Client-only: dropping the param shouldn't re-render the page on the server.
            replacePageUrl(query ? `${pathname}?${query}` : pathname);
        }, HIGHLIGHT_DURATION_MS);

        return () => {
            window.clearTimeout(highlightTimer);
            window.clearTimeout(urlTimer);
        };
    }, [pathname, searchParams, sectionId]);

    return { sectionRef, isTargeted };
}
