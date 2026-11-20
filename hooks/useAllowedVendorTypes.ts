'use client';

import { useMemo } from 'react';

import type { PartnerRole } from '@/lib/api/types';
import { allowedVendorTypes } from '@/lib/vendors';
import { useActiveEvent } from '@/providers/EventProvider';

// The vendor types this event's plan allows. None while another event is active.
export function useAllowedVendorTypes(eventId: string): PartnerRole[] {
    const activeEvent = useActiveEvent();
    const modules = activeEvent?.id === eventId ? activeEvent.modules : undefined;
    return useMemo(() => allowedVendorTypes(modules), [modules]);
}
