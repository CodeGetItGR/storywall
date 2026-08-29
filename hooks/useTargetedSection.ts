'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const HIGHLIGHT_DURATION_MS = 2200;

export function useTargetedSection(sectionId: string) {
    const pathname = usePathname();
    const router = useRouter();
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
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }, HIGHLIGHT_DURATION_MS);

        return () => {
            window.clearTimeout(highlightTimer);
            window.clearTimeout(urlTimer);
        };
    }, [pathname, router, searchParams, sectionId]);

    return { sectionRef, isTargeted };
}
