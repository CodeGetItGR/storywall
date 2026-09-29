'use client';

import type { ReactNode } from 'react';

import { useDemoEventContextValue } from '@/hooks/useDemoEventContextValue';
import type { DemoSession } from '@/lib/demo/demoSession';
import { EventContext } from '@/providers/EventProvider';

// Same pattern as DemoAuthProvider: render the real EventContext with the demo's event and
// host membership so useActiveEvent()/useIsHost()/useActiveMember() work unmodified for every
// reused feature component.
export function DemoEventProvider({ session, children }: { session: DemoSession; children: ReactNode }) {
    return <EventContext.Provider value={useDemoEventContextValue(session)}>{children}</EventContext.Provider>;
}
