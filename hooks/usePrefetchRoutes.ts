'use client';

import { useRouter } from 'next/navigation';

import { useIsDemoRoute } from '@/hooks/useIsDemoRoute';

// For menus that navigate with router.push instead of <Link>, which Next never
// prefetches on its own. Call the returned function when the menu opens, so
// picking an item shows its loading screen at once instead of waiting on the
// server. Inside the demo it does nothing, like AppLink.
export function usePrefetchRoutes(hrefs: string[]) {
    const router = useRouter();
    const isDemoRoute = useIsDemoRoute();

    return () => {
        if (isDemoRoute) return;
        for (const href of hrefs) router.prefetch(href);
    };
}
