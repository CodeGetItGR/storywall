import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { type ReactNode, Suspense } from 'react';

import { DeletedEventRouteGuard } from '@/components/event/DeletedEventRouteGuard';
import { DraftEventRouteGuard } from '@/components/event/DraftEventRouteGuard';
import { EventLifecycleBanner } from '@/components/event/EventLifecycleBanner';
import { EventThemeScope } from '@/components/event/EventThemeScope';
import { SuspendedEventRouteGuard } from '@/components/event/SuspendedEventRouteGuard';
import { MyRoleSheetHost } from '@/components/memberRoles/MyRoleSheetHost';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

// Prefetches the memberships EventProvider's useMyEvents() reads on mount, so
// the event switcher is in the query cache by the time the client hydrates.
// The detail of the event the URL names is seeded by events/[eventId]/layout.tsx,
// in parallel with this; this layout can't see the URL's event id.
export default async function EventLayout({ children }: { children: ReactNode }) {
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext();

    if (context) queryClient.setQueryData(myEventsKeys.all, context.memberships);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <EventThemeScope>
                <SuspendedEventRouteGuard>
                    <EventLifecycleBanner />
                    <DraftEventRouteGuard>
                        <DeletedEventRouteGuard>
                            <div className="lg:max-w-none">{children}</div>
                            {/* Role sheet */}
                            <Suspense fallback={null}>
                                <MyRoleSheetHost />
                            </Suspense>
                        </DeletedEventRouteGuard>
                    </DraftEventRouteGuard>
                </SuspendedEventRouteGuard>
            </EventThemeScope>
        </HydrationBoundary>
    );
}
