'use client';

import type { ReactNode } from 'react';

import { DEMO_HOST_MEMBER_ID } from '@/lib/demo/demoConstants';
import { buildSeedEvent, buildSeedMembers } from '@/lib/demo/seedData';
import { EventContext } from '@/providers/EventProvider';

// Same pattern as DemoAuthProvider: render the real EventContext with a static fake
// membership/event state so useActiveEvent()/useIsHost()/useActiveMember() work unmodified
// for every reused feature component.
export function DemoEventProvider({ children }: { children: ReactNode }) {
    const memberships = buildSeedMembers();
    const activeEvent = buildSeedEvent();
    const activeMember = memberships.find((m) => m.id === DEMO_HOST_MEMBER_ID) ?? null;

    return (
        <EventContext.Provider
            value={{
                memberships,
                activeEvent,
                activeMember,
                isHost: true,
                isLoading: false,
            }}
        >
            {children}
        </EventContext.Provider>
    );
}
