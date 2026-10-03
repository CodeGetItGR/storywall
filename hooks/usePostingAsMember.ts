'use client';

import { useSyncExternalStore } from 'react';

import { useEventMembers } from '@/hooks/useEventMembers';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { getDemoActAs, subscribeDemoActAs } from '@/lib/demo/demoActAs';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

function getServerSnapshot() {
    return null;
}

// Who new posts and stories are authored as: the viewer's own membership, or
// the demo persona an admin picked in the act-as bar.
export function usePostingAsMember(): { member: EventMemberResponseDto | null; isPersona: boolean } {
    const activeMember = useActiveMember();
    const eventId = useActiveEvent()?.id ?? null;
    const actAs = useSyncExternalStore(subscribeDemoActAs, getDemoActAs, getServerSnapshot);
    const actAsEventId = actAs && actAs.eventId === eventId ? eventId : null;
    // The act-as bar already loads this list, so this reads the same cache.
    const members = useEventMembers(actAsEventId);
    const persona = actAs && actAsEventId ? (members.data?.find((member) => member.id === actAs.memberId) ?? null) : null;

    return persona ? { member: persona, isPersona: true } : { member: activeMember, isPersona: false };
}
