'use client';

import type { EventCapabilitiesDto } from '@/lib/api/types';
import { eventCapabilities } from '@/lib/eventCapabilities';
import { useActiveEvent } from '@/providers/EventProvider';

// The active event's capabilities: read these instead of its modules. null while no event is loaded, and for
// a suspended one.
export function useEventCapabilities(): EventCapabilitiesDto | null {
    return eventCapabilities(useActiveEvent());
}
