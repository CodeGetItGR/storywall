'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useRolePromptOnce } from '@/hooks/useRolePromptOnce';
import { canEditOwnRole, memberHasRole, ROLE_SHEET_PARAM, ROLE_SHEET_VALUE, withoutRoleSheetParam } from '@/lib/memberRoles';
import { routes } from '@/lib/routes';
import { useActiveEvent, useActiveMember, useEventContextLoading } from '@/providers/EventProvider';

// The member's own role sheet. ?sheet=role is a one-shot trigger: it is
// replaced away first and the sheet opens only once it's gone, so Back (which
// the sheet's Modal handles) never lands on a URL that reopens it.
export function useMyRoleSheet() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeEvent = useActiveEvent();
    const member = useActiveMember();
    const isLoading = useEventContextLoading();

    const enabled = canEditOwnRole(activeEvent, member);
    const requested = searchParams.get(ROLE_SHEET_PARAM) === ROLE_SHEET_VALUE;
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!requested || isLoading) return;
        router.replace(withoutRoleSheetParam(pathname, searchParams.toString()), { scroll: false });
        // eslint-disable-next-line react-hooks/set-state-in-effect -- The trigger param is consumed once; open after it leaves the URL.
        if (enabled) setPending(true);
    }, [enabled, isLoading, pathname, requested, router, searchParams]);

    useEffect(() => {
        if (!pending || requested) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Opens only once the trigger param is gone.
        setPending(false);
        setOpen(true);
    }, [pending, requested]);

    const openSheet = useCallback(() => setOpen(true), []);
    const close = useCallback(() => setOpen(false), []);

    const feedPath = activeEvent ? routes.events.feed(activeEvent.id) : null;
    const noRole = member ? !memberHasRole(member) : false;
    useRolePromptOnce({
        active: enabled && feedPath !== null && pathname === feedPath && !open && !pending && noRole,
        memberId: member?.id ?? null,
        onPromptAction: openSheet,
    });

    return { open: open && enabled, close, eventId: activeEvent?.id ?? null, member };
}
