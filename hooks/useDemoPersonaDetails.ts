'use client';

import { useCallback, useState } from 'react';

import { useMemberRoleLabel } from '@/hooks/useMemberRoleLabel';
import { useRsvp } from '@/hooks/useRsvps';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { canManageMemberRoles } from '@/lib/memberRoles';
import { useActiveEvent } from '@/providers/EventProvider';

type PersonaSheet = { kind: 'role' | 'rsvp'; memberId: string } | null;

const NO_GUEST = { relationshipRole: null, customRelationshipRole: null };

// The selected demo persona's role and RSVP, and which sheet edits them. The
// admin co-hosts the demo, so both are set as a host on the persona's behalf.
export function useDemoPersonaDetails(guest: EventMemberResponseDto | null) {
    const activeEvent = useActiveEvent();
    const roleLabel = useMemberRoleLabel(guest ?? NO_GUEST, activeEvent?.eventType);
    const canEditRole = Boolean(guest && !guest.isFeatured && canManageMemberRoles(activeEvent, true));
    const canEditRsvp = Boolean(guest && isModuleAvailable(activeEvent?.modules, 'rsvp'));
    const rsvp = useRsvp(canEditRsvp ? (guest?.rsvpId ?? null) : null);
    const rsvpStatus: 'rsvpNone' | 'rsvpAttending' | 'rsvpDeclined' =
        guest?.rsvpId && rsvp.data ? (rsvp.data.attendanceStatus === 'ATTENDING' ? 'rsvpAttending' : 'rsvpDeclined') : 'rsvpNone';

    const [sheet, setSheet] = useState<PersonaSheet>(null);
    // A sheet belongs to the guest it was opened for; picking another guest closes it.
    const openSheet = sheet && guest && sheet.memberId === guest.id ? sheet.kind : null;

    const openRole = useCallback(() => {
        if (guest) setSheet({ kind: 'role', memberId: guest.id });
    }, [guest]);
    const openRsvp = useCallback(() => {
        if (guest) setSheet({ kind: 'rsvp', memberId: guest.id });
    }, [guest]);
    const closeSheet = useCallback(() => setSheet(null), []);

    return { roleLabel, canEditRole, canEditRsvp, rsvpStatus, openSheet, openRole, openRsvp, closeSheet };
}
