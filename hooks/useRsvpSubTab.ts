import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { resolveRsvpSubTab, type RsvpSubTab } from '@/lib/rsvpReport';

// The RSVP sub-tab lives in ?section= so a report page's Close (history back)
// returns to the Reports sub-tab. Works on both pages that show RsvpTab.
//
// Writes go straight through window.history.replaceState instead of
// router.replace: a router navigation re-runs the server page (and its ~6
// backend prefetch calls) on every sub-tab click, and Next keeps
// useSearchParams in sync with a plain history write anyway (see
// usePlansSection's setView for the same pattern).
export function useRsvpSubTab() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const subTab = resolveRsvpSubTab(searchParams.get('section'));

    const setSubTab = useCallback(
        (next: RsvpSubTab) => {
            if (next === subTab) return;

            const params = new URLSearchParams(searchParams.toString());
            if (next === 'stats') params.delete('section');
            else params.set('section', next);
            const query = params.toString();
            window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
        },
        [pathname, searchParams, subTab],
    );

    return { subTab, setSubTab };
}
