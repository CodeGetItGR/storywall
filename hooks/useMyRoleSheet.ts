'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useRolePromptOnce } from '@/hooks/useRolePromptOnce';
import { canEditOwnRole, memberHasRole, ROLE_SHEET_PARAM, ROLE_SHEET_VALUE, withoutRoleSheetParam } from '@/lib/memberRoles';
import { subscribeMyRoleSheetRequests } from '@/lib/myRoleSheetRequests';
import { replacePageUrl } from '@/lib/overlayHistory';
import { routes } from '@/lib/routes';
import { useActiveEvent, useActiveMember, useContentAccessMode, useEventContextLoading } from '@/providers/EventProvider';

// The member's own role sheet. Chip taps open it through
// requestMyRoleSheet, with no URL change. ?sheet=role (tools menu, links) is a
// one-shot trigger: it is replaced away on the client first and the sheet
// opens only once it's gone, so Back (which the sheet's Modal handles) never
// lands on a URL that reopens it, and no server render happens.
export function useMyRoleSheet() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeEvent = useActiveEvent();
    const member = useActiveMember();
    const isLoading = useEventContextLoading();
    const isDemoVisitor = useContentAccessMode() === 'demoVisitor';

    const enabled = !isDemoVisitor && canEditOwnRole(activeEvent, member);
    const requested = searchParams.get(ROLE_SHEET_PARAM) === ROLE_SHEET_VALUE;
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!requested || isLoading) return;
        replacePageUrl(withoutRoleSheetParam(pathname, searchParams.toString()));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- The trigger param is consumed once; open after it leaves the URL.
        if (enabled) setPending(true);
    }, [enabled, isLoading, pathname, requested, searchParams]);

    useEffect(() => {
        if (!pending || requested) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Opens only once the trigger param is gone.
        setPending(false);
        setOpen(true);
    }, [pending, requested]);

    const openSheet = useCallback(() => setOpen(true), []);
    useEffect(() => subscribeMyRoleSheetRequests(openSheet), [openSheet]);
    const close = useCallback(() => setOpen(false), []);

    const feedPath = activeEvent ? routes.events.feed(activeEvent.id) : null;
    const noRole = member ? !memberHasRole(member) : false;
    useRolePromptOnce({
        active: enabled && feedPath !== null && pathname === feedPath && !open && !pending && !requested && noRole,
        memberId: member?.id ?? null,
        onPromptAction: openSheet,
    });

    return { open: open && enabled, close, eventId: activeEvent?.id ?? null, member };
}
