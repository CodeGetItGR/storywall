import type { MouseEvent } from 'react';

import { ROLE_SHEET_PARAM, ROLE_SHEET_VALUE } from '@/lib/memberRoles';

// In-app requests to open the viewer's own role sheet (their role chip, the
// "My role" tool). MyRoleSheetHost subscribes on every event page. Going
// through the URL instead would cost a server render of the page for every
// tap; ?sheet=role stays for links followed from outside an event page.
type Listener = () => void;

const listeners = new Set<Listener>();

// True when a mounted sheet host took the request.
export function requestMyRoleSheet(): boolean {
    listeners.forEach((listener) => listener());
    return listeners.size > 0;
}

// For tool links: opens the sheet in place when the href is the role sheet
// link and a host is mounted. False means the caller should navigate.
export function openMyRoleSheetFromHref(href: string): boolean {
    const isRoleSheetLink = new URL(href, 'http://local').searchParams.get(ROLE_SHEET_PARAM) === ROLE_SHEET_VALUE;
    return isRoleSheetLink && requestMyRoleSheet();
}

// Link onClick: opens the sheet in place instead of following the link.
// Modified clicks (new tab, etc.) keep the browser's default.
export function handleRoleSheetLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (openMyRoleSheetFromHref(event.currentTarget.getAttribute('href') ?? '')) event.preventDefault();
}

export function subscribeMyRoleSheetRequests(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
