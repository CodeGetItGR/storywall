'use client';

import { useRouter } from 'next/navigation';

// For menus that navigate with router.push instead of <Link>, which Next never
// prefetches on its own. Call the returned function when the menu opens, so
// picking an item shows its loading screen at once instead of waiting on the
// server.
export function usePrefetchRoutes(hrefs: string[]) {
    const router = useRouter();

    return () => {
        for (const href of hrefs) router.prefetch(href);
    };
}
