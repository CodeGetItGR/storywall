// components/manage/nav/ManageNavLink.tsx
'use client';

import type { MouseEvent, ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { isManagePage, manageNavHref, type ManageNavKey, type ManageSection } from '@/lib/manageSections';

type ManageNavLinkProps = {
    eventId: string;
    navKey: ManageNavKey;
    active?: boolean;
    // Given inside the dashboard page: a section then opens in place, without a server render.
    onSelectSection?: (section: ManageSection) => void;
    className?: string;
    children: ReactNode;
};

/** One dashboard entry. A page, a click outside the dashboard or a new-tab click follows the link. */
export function ManageNavLink({ eventId, navKey, active = false, onSelectSection, className, children }: ManageNavLinkProps) {
    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        if (!onSelectSection || isManagePage(navKey)) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onSelectSection(navKey);
    }

    return (
        <AppLink href={manageNavHref(eventId, navKey)} onClick={handleClick} aria-current={active ? 'page' : undefined} className={className}>
            {children}
        </AppLink>
    );
}
