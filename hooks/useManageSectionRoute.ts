'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { type ManageSection, parseManageSection, resolveManageSection } from '@/lib/manageSections';
import { pushPageEntry, replacePageUrl } from '@/lib/overlayHistory';
import { routes } from '@/lib/routes';

// Marks a history entry opened from the dashboard's Overview, so going back to it is a Back step.
const OPENED_FROM_OVERVIEW_KEY = 'manageOpenedFromOverview';

function openedFromOverview(): boolean {
    const state: unknown = window.history.state;
    return typeof state === 'object' && state !== null && (state as Record<string, unknown>)[OPENED_FROM_OVERVIEW_KEY] === true;
}

/** The dashboard section in `?tab=`, and the way to switch it without a server render. */
export function useManageSectionRoute({
    eventId,
    isDraft,
    isDeleted,
    visibleSections,
    pendingSections,
}: {
    eventId: string;
    isDraft: boolean;
    isDeleted: boolean;
    visibleSections: ManageSection[];
    pendingSections: ManageSection[];
}) {
    const searchParams = useSearchParams();
    const requestedSection = parseManageSection(searchParams.get('tab'));
    const section = resolveManageSection(requestedSection, { isDraft, visibleSections, pendingSections });

    const navigateToSection = useCallback(
        (next: ManageSection) => {
            if (next === section) return;
            // Back to the Overview we came from: step back, so the Back gesture and the button agree.
            if (next === 'overview' && openedFromOverview()) {
                window.history.back();
                return;
            }
            const nextParams = new URLSearchParams(searchParams.toString());
            if (next === 'overview') nextParams.delete('tab');
            else nextParams.set('tab', next);
            const query = nextParams.toString();
            const manageRoot = routes.events.manage(eventId);
            const url = query ? `${manageRoot}?${query}` : manageRoot;
            // Client-only, so a switch doesn't wait on a server render. Leaving the Overview (the
            // menu on a phone) is a Back step; moving between sections replaces it and keeps its mark.
            if (section === 'overview') pushPageEntry(url, { [OPENED_FROM_OVERVIEW_KEY]: true });
            else replacePageUrl(url);
            // On a phone the next page starts at its header, not where the list was scrolled to.
            window.scrollTo({ top: 0 });
        },
        [eventId, searchParams, section],
    );

    useEffect(() => {
        if (!isDeleted && requestedSection !== section) replacePageUrl(routes.events.manage(eventId));
    }, [eventId, isDeleted, requestedSection, section]);

    return { section, navigateToSection, cancelledCheckout: searchParams.get('cancelled') === 'true' };
}
