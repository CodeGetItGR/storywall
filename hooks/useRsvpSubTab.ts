import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export type RsvpSubTab = 'stats' | 'list' | 'reports';

const SUB_TABS: RsvpSubTab[] = ['stats', 'list', 'reports'];

function isRsvpSubTab(value: string | null): value is RsvpSubTab {
    return value !== null && (SUB_TABS as string[]).includes(value);
}

// The RSVP sub-tab lives in ?section= so a report page's Close (history back)
// returns to the Reports sub-tab. Works on both pages that show RsvpTab.
export function useRsvpSubTab() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const requested = searchParams.get('section');
    const subTab: RsvpSubTab = isRsvpSubTab(requested) ? requested : 'stats';

    const setSubTab = useCallback(
        (next: RsvpSubTab) => {
            const params = new URLSearchParams(searchParams.toString());
            if (next === 'stats') params.delete('section');
            else params.set('section', next);
            const query = params.toString();
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams],
    );

    return { subTab, setSubTab };
}
