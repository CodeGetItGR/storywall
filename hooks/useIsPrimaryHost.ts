'use client';

import { isPrimaryHost } from '@/lib/eventLifecycle';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

// Only the event's main host can buy anything for it (the server answers 4006
// otherwise), so purchase actions check this.
export function useIsPrimaryHost(): boolean {
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    return activeEvent ? isPrimaryHost(activeEvent.hosts, activeMember?.id) : false;
}
