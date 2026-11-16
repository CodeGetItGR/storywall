'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { type ManageSection, parseManageSection, resolveManageSection } from '@/lib/manageSections';
import { replacePageUrl } from '@/lib/overlayHistory';
import { routes } from '@/lib/routes';

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
            const nextParams = new URLSearchParams(searchParams.toString());
            if (next === 'overview') nextParams.delete('tab');
            else nextParams.set('tab', next);
            const query = nextParams.toString();
            const manageRoot = routes.events.manage(eventId);
            // Client-only, so a tab switch doesn't wait on a server render.
            replacePageUrl(query ? `${manageRoot}?${query}` : manageRoot);
            // On a phone the next page starts at its header, not where the list was scrolled to.
            window.scrollTo({ top: 0 });
        },
        [eventId, searchParams],
    );

    useEffect(() => {
        if (!isDeleted && requestedSection !== section) replacePageUrl(routes.events.manage(eventId));
    }, [eventId, isDeleted, requestedSection, section]);

    return { section, navigateToSection, cancelledCheckout: searchParams.get('cancelled') === 'true' };
}
